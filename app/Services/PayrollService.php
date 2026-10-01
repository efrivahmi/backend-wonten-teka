<?php

namespace App\Services;

use App\Models\AttendanceLog;
use App\Models\BpjsRate;
use App\Models\Claim;
use App\Models\Employee;
use App\Models\PayrollComponent;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\Pph21TerRate;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollService
{
    public function generatePayrollRun(int $month, int $year, int $runByUserId, array $customDeductions = []): PayrollRun
    {
        $run = PayrollRun::where('period_month', $month)->where('period_year', $year)->first();
        if ($run && $run->status !== 'draft') {
            throw ValidationException::withMessages(['period' => 'Periode ini sudah difinalisasi dan tidak dapat dihitung ulang.']);
        }

        return DB::transaction(function () use ($month, $year, $runByUserId, $run, $customDeductions) {
            $storedSettings = Setting::where('key', 'payroll_config')->first()?->value ?? [];
            $storedSettings = is_array($storedSettings) ? $storedSettings : [];
            $settings = array_merge([
                'attendance_period_start' => 21,
                'attendance_period_end' => 20,
                'payment_day' => 25,
                'attendance_deduction_enabled' => false,
                'attendance_deduction_per_day' => 0,
                'pph21_enabled' => false,
                'bpjs_kesehatan_enabled' => false,
                'bpjs_jht_enabled' => false,
                'bpjs_jp_enabled' => false,
                'bpjs_jkk_enabled' => false,
                'bpjs_jkm_enabled' => false,
                'bpjs_enabled' => false,
                'jkk_risk_class' => 'I',
                'job_expense_rate' => 0.05,
                'job_expense_monthly_cap' => 500000,
            ], $storedSettings);
            foreach (['kesehatan', 'jht', 'jp', 'jkk', 'jkm'] as $program) {
                $key = "bpjs_{$program}_enabled";
                if (!array_key_exists($key, $storedSettings)) {
                    $settings[$key] = (bool) ($settings['bpjs_enabled'] ?? false);
                }
            }
            $settings['bpjs_enabled'] = collect(['kesehatan', 'jht', 'jp', 'jkk', 'jkm'])
                ->contains(fn ($program) => (bool) $settings["bpjs_{$program}_enabled"]);
            [$periodStart, $periodEnd] = $this->periodBounds($month, $year, $settings);
            $paymentDate = Carbon::create($year, $month, 1, 0, 0, 0, config('app.business_timezone', 'Asia/Jakarta'))
                ->day(min((int) $settings['payment_day'], Carbon::create($year, $month, 1)->daysInMonth));

            $run ??= new PayrollRun(['period_month' => $month, 'period_year' => $year]);
            if ($run->exists) {
                Claim::where('payroll_run_id', $run->id)->update(['payroll_run_id' => null]);
                $run->payslips()->delete();
            }
            $run->fill([
                'status' => 'draft',
                'run_by' => $runByUserId,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'scheduled_payment_date' => $paymentDate->toDateString(),
                'configuration_snapshot' => $settings,
            ]);
            $run->configuration_snapshot = array_merge($settings, [
                'payroll_mode' => 'automatic',
                'custom_deductions' => $customDeductions,
            ]);
            $run->save();

            $components = PayrollComponent::active()->where('applies_to', 'all')->orderBy('sort_order')->get();
            if (!$components->contains(fn ($component) => strtolower((string) $component->code) === 'base')) {
                throw ValidationException::withMessages(['payroll_components' => 'Tambahkan komponen penghasilan berkode BASE terlebih dahulu.']);
            }
            if ($settings['pph21_enabled'] && !Pph21TerRate::whereDate('effective_from', '<=', $periodEnd)->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $periodEnd))->exists()) {
                throw ValidationException::withMessages(['pph21' => 'PPh 21 diaktifkan tetapi tarif TER yang berlaku belum diatur. Lengkapi tabel tarif terlebih dahulu.']);
            }

            $payrollDate = $periodEnd->copy();
            Employee::active()->orderBy('id')->chunk(100, function ($employees) use ($run, $components, $payrollDate, $periodStart, $periodEnd, $settings, $customDeductions) {
                foreach ($employees as $employee) {
                    $this->calculateEmployeePayslip($run, $employee, $components, $payrollDate, $periodStart, $periodEnd, $settings, $customDeductions);
                }
            });

            return $run->fresh()->loadCount('payslips');
        });
    }

    private function periodBounds(int $month, int $year, array $settings): array
    {
        $timezone = config('app.business_timezone', 'Asia/Jakarta');
        $periodEnd = Carbon::create($year, $month, 1, 0, 0, 0, $timezone)
            ->day(min((int) $settings['attendance_period_end'], Carbon::create($year, $month, 1)->daysInMonth));
        $startDay = (int) $settings['attendance_period_start'];
        $crossesMonth = $startDay > (int) $settings['attendance_period_end'];
        $startMonth = $crossesMonth ? $periodEnd->copy()->subMonthNoOverflow() : $periodEnd->copy();
        $periodStart = $startMonth->copy()->day(min($startDay, $startMonth->daysInMonth))->startOfDay();

        return [$periodStart, $periodEnd->copy()->endOfDay()];
    }

    private function calculateEmployeePayslip(
        PayrollRun $run,
        Employee $employee,
        $components,
        Carbon $payrollDate,
        Carbon $periodStart,
        Carbon $periodEnd,
        array $settings,
        array $customDeductions = [],
    ): void {
        $basicSalary = (float) $employee->basic_salary;
        $totalEarnings = 0.0;
        $totalDeductions = 0.0;
        $taxableEarnings = 0.0;
        $details = [];

        foreach ($components as $component) {
            $amount = strtolower((string) $component->code) === 'base' && $basicSalary > 0
                ? $basicSalary
                : (float) $component->default_amount;
            $details[] = ['name' => $component->name, 'code' => $component->code, 'type' => $component->type, 'amount' => round($amount, 2), 'is_taxable' => (bool) $component->is_taxable];
            if ($component->type === 'earning') {
                $totalEarnings += $amount;
                if ($component->is_taxable) $taxableEarnings += $amount;
                if (strtolower((string) $component->code) === 'base') $basicSalary = $amount;
            } else {
                $totalDeductions += $amount;
            }
        }

        $absenceDays = 0;
        $attendanceDeduction = 0.0;
        if ($settings['attendance_deduction_enabled']) {
            $fromUtc = $periodStart->copy()->timezone('UTC');
            $toUtc = $periodEnd->copy()->timezone('UTC');
            $absenceDays = AttendanceLog::where('employee_id', $employee->id)
                ->where('status', 'absent')
                ->whereBetween('check_in_at', [$fromUtc, $toUtc])
                ->get(['check_in_at'])
                ->map(fn ($log) => $log->check_in_at?->copy()->setTimezone(config('app.business_timezone', 'Asia/Jakarta'))->toDateString())
                ->filter()->unique()->count();
            $attendanceDeduction = round($absenceDays * (float) $settings['attendance_deduction_per_day'], 2);
            $totalDeductions += $attendanceDeduction;
            if ($attendanceDeduction > 0) $details[] = ['name' => 'Potongan ketidakhadiran/alpha', 'type' => 'deduction', 'amount' => $attendanceDeduction, 'days' => $absenceDays, 'is_taxable' => false];
        }

        $claims = Claim::with('claimCategory')->where('employee_id', $employee->id)->where('status', 'approved')
            ->whereNull('payroll_run_id')->whereBetween('expense_date', [$periodStart->toDateString(), $periodEnd->toDateString()])->get();
        foreach ($claims as $claim) {
            $amount = (float) $claim->amount;
            $totalEarnings += $amount;
            $details[] = ['name' => 'Reimbursement: '.($claim->claimCategory->name ?? 'Klaim'), 'type' => 'earning', 'amount' => $amount, 'is_taxable' => false];
            $claim->update(['payroll_run_id' => $run->id]);
        }

        $bpjs = $this->calculateBpjs($basicSalary, $payrollDate, $settings);
        $bpjsEmployee = $bpjs['kesehatan_employee'] + $bpjs['jht_employee'] + $bpjs['jp_employee'];
        $totalDeductions += $bpjsEmployee;
        if ($bpjsEmployee > 0) $details[] = ['name' => 'Iuran BPJS bagian karyawan', 'type' => 'deduction', 'amount' => round($bpjsEmployee, 2), 'is_taxable' => false];

        $pph21 = $settings['pph21_enabled'] ? $this->calculatePph21($employee, $run, $taxableEarnings, $payrollDate, $settings, $basicSalary) : 0.0;
        $totalDeductions += $pph21;
        if ($pph21 != 0.0) $details[] = ['name' => $payrollDate->month === 12 ? 'Rekonsiliasi PPh 21 tahunan' : 'PPh 21 (TER bulanan)', 'type' => $pph21 >= 0 ? 'deduction' : 'earning', 'amount' => round(abs($pph21), 2), 'is_taxable' => false];

        foreach ($customDeductions as $deduction) {
            $amount = round((float) $deduction['amount'], 2);
            $totalDeductions += $amount;
            $details[] = [
                'name' => $deduction['name'],
                'type' => 'deduction',
                'amount' => $amount,
                'is_taxable' => false,
                'custom' => true,
            ];
        }

        if ($totalDeductions > $totalEarnings) {
            throw ValidationException::withMessages([
                'custom_deductions' => "Total potongan melebihi gaji kotor karyawan {$employee->full_name}.",
            ]);
        }

        Payslip::create([
            'payroll_run_id' => $run->id, 'employee_id' => $employee->id,
            'basic_salary' => round($basicSalary, 2), 'attendance_absence_days' => $absenceDays,
            'attendance_deduction_amount' => round($attendanceDeduction, 2),
            'total_earnings' => round($totalEarnings, 2), 'total_deductions' => round($totalDeductions, 2),
            'gross_salary' => round($totalEarnings, 2), 'net_salary' => round($totalEarnings - $totalDeductions, 2),
            'pph21_amount' => round($pph21, 2),
            'bpjs_kesehatan_employee' => round($bpjs['kesehatan_employee'], 2), 'bpjs_kesehatan_employer' => round($bpjs['kesehatan_employer'], 2),
            'bpjs_jht_employee' => round($bpjs['jht_employee'], 2), 'bpjs_jht_employer' => round($bpjs['jht_employer'], 2),
            'bpjs_jp_employee' => round($bpjs['jp_employee'], 2), 'bpjs_jp_employer' => round($bpjs['jp_employer'], 2),
            'bpjs_jkk_employer' => round($bpjs['jkk_employer'], 2), 'bpjs_jkm_employer' => round($bpjs['jkm_employer'], 2),
            'bpjs_jkp_employer' => round($bpjs['jkp_employer'], 2),
            'components_detail' => $details,
        ]);
    }

    private function calculateBpjs(float $salary, Carbon $date, array $settings): array
    {
        $result = array_fill_keys(['kesehatan_employee','kesehatan_employer','jht_employee','jht_employer','jp_employee','jp_employer','jkk_employer','jkm_employer','jkp_employer'], 0.0);
        $rates = BpjsRate::whereDate('effective_from', '<=', $date)->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date))
            ->orderByDesc('effective_from')->get()->groupBy(fn ($rate) => strtolower($rate->program));
        // JKP is financed through government funding and recomposition of JKK/JKM,
        // not as an additional employee/employer payroll-rate line.
        foreach (['kesehatan', 'jht', 'jp', 'jkk', 'jkm'] as $program) {
            if (empty($settings["bpjs_{$program}_enabled"])) continue;
            $programRates = $rates->get($program, collect());
            $rate = $program === 'jkk'
                ? $programRates->firstWhere('jkk_risk_class', $settings['jkk_risk_class'])
                : $programRates->first();
            if (!$rate) {
                $label = $program === 'jkk' ? "JKK kelas risiko {$settings['jkk_risk_class']}" : strtoupper($program);
                throw ValidationException::withMessages(['bpjs' => "Tarif {$label} yang berlaku pada periode ini belum dikonfigurasi."]);
            }
            $base = $rate->salary_cap ? min($salary, (float) $rate->salary_cap) : $salary;
            $employeeKey = $program.'_employee';
            $employerKey = $program.'_employer';
            if (array_key_exists($employeeKey, $result)) $result[$employeeKey] = round($base * (float) $rate->employee_rate, 2);
            if (array_key_exists($employerKey, $result)) $result[$employerKey] = round($base * (float) $rate->employer_rate, 2);
        }
        return $result;
    }

    private function calculatePph21(Employee $employee, PayrollRun $run, float $taxableIncome, Carbon $date, array $settings, float $basicSalary): float
    {
        $category = $this->determineTerCategory($employee->ptkp_status ?? 'TK/0');
        if ((int) $run->period_month === 12) {
            $previousSlips = Payslip::where('employee_id', $employee->id)->whereHas('payrollRun', fn ($q) => $q->where('period_year', $run->period_year)->where('period_month', '<', 12)->whereIn('status', ['finalized', 'paid']))->with('payrollRun')->get();
            $priorTaxable = $previousSlips->sum(fn ($slip) => collect($slip->components_detail ?? [])->filter(fn ($item) => ($item['type'] ?? null) === 'earning' && ($item['is_taxable'] ?? false))->sum('amount'));
            $annualTaxable = $priorTaxable + $taxableIncome;
            $months = max(1, $previousSlips->count() + 1);
            $jobExpense = min($annualTaxable * (float) $settings['job_expense_rate'], (float) $settings['job_expense_monthly_cap'] * $months);
            $priorPensionContributions = $previousSlips->sum(fn ($slip) =>
                (float) $slip->bpjs_jht_employee + (float) $slip->bpjs_jp_employee
            );
            $currentPensionContributions = 0.0;
            // Only employee-paid JHT/JP are included as annual deductions; the
            // passed contribution aggregate is not used because it also includes health.
            if (!empty($settings['bpjs_jht_enabled']) || !empty($settings['bpjs_jp_enabled'])) {
                $currentRates = BpjsRate::whereDate('effective_from', '<=', $date)->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date))->orderByDesc('effective_from')->get()->groupBy(fn ($row) => strtolower($row->program));
                foreach (['jht', 'jp'] as $program) {
                    if (empty($settings["bpjs_{$program}_enabled"])) continue;
                    $row = $currentRates->get($program, collect())->first();
                    if ($row) {
                        $base = $row->salary_cap ? min($basicSalary, (float) $row->salary_cap) : $basicSalary;
                        $currentPensionContributions += $base * (float) $row->employee_rate;
                    }
                }
            }
            $ptkp = DB::table('ptkp_thresholds')->where('status', strtoupper($employee->ptkp_status ?? 'TK/0'))
                ->whereDate('effective_from', '<=', $date)->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date))->orderByDesc('effective_from')->value('annual_threshold');
            $brackets = DB::table('pph21_progressive_brackets')->whereDate('effective_from', '<=', $date)
                ->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date))->orderBy('bracket_start')->get();
            if ($ptkp === null || $brackets->isEmpty()) {
                throw ValidationException::withMessages(['pph21' => 'Untuk payroll Desember, lengkapi PTKP dan lapisan tarif progresif PPh 21 yang berlaku.']);
            }
            $taxableAnnual = max(0, $annualTaxable - $jobExpense - $priorPensionContributions - $currentPensionContributions - (float) $ptkp);
            $annualTax = 0.0;
            foreach ($brackets as $bracket) {
                if ($taxableAnnual <= (float) $bracket->bracket_start) continue;
                $upper = $bracket->bracket_end === null ? $taxableAnnual : min($taxableAnnual, (float) $bracket->bracket_end);
                $annualTax += max(0, $upper - (float) $bracket->bracket_start) * (float) $bracket->rate;
            }
            $taxAlreadyWithheld = $previousSlips->sum('pph21_amount');
            return round($annualTax - $taxAlreadyWithheld, 2);
        }

        $rate = Pph21TerRate::where('category', $category)->whereDate('effective_from', '<=', $date)
            ->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $date))
            ->where('income_range_start', '<=', $taxableIncome)
            ->where(fn ($q) => $q->where('income_range_end', '>=', $taxableIncome)->orWhereNull('income_range_end'))
            ->orderByDesc('effective_from')->value('effective_rate');
        if ($rate === null) throw ValidationException::withMessages(['pph21' => "Tarif TER {$category} untuk penghasilan Rp ".number_format($taxableIncome, 0, ',', '.')." belum dikonfigurasi."]);

        // Rates are stored as fractions: 0.005000 represents 0.5 percent.
        return round($taxableIncome * (float) $rate, 2);
    }

    private function determineTerCategory(string $ptkp): string
    {
        $ptkp = strtoupper($ptkp);
        if (in_array($ptkp, ['TK/0', 'TK/1', 'K/0'], true)) return 'A';
        if (in_array($ptkp, ['TK/2', 'TK/3', 'K/1', 'K/2', 'K/I/0', 'K/I/1'], true)) return 'B';
        return in_array($ptkp, ['K/3', 'K/I/2', 'K/I/3'], true) ? 'C' : 'A';
    }
}
