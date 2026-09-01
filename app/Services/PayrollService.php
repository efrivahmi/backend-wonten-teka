<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayrollComponent;
use App\Models\Claim;
use App\Models\BpjsRate;
use App\Models\Pph21TerRate;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollService
{
    /**
     * Generate a new payroll run for the specified month and year.
     */
    public function generatePayrollRun(Company $company, int $month, int $year, int $runByUserId): PayrollRun
    {
        // Check if run already exists
        $existingRun = PayrollRun::query()
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->first();

        if ($existingRun && $existingRun->status !== 'draft') {
            throw new \Exception("Payroll for this period is already finalized.");
        }

        return DB::transaction(function () use ($company, $month, $year, $runByUserId, $existingRun) {
            
            $run = $existingRun ?? PayrollRun::create([
                
                'period_month' => $month,
                'period_year' => $year,
                'status' => 'draft',
                'run_by' => $runByUserId,
            ]);

            // If it existed, we clear the payslips and regenerate
            if ($existingRun) {
                $existingRun->payslips()->delete();
            }

            // Get universal components
            $components = PayrollComponent::query()
                ->active()
                ->where('applies_to', 'all')
                ->get();

            // Load all active employees
            $employees = Employee::query()
                ->active()
                ->get();
                
            // Current dates for rates
            $payrollDate = Carbon::create($year, $month, 1)->endOfMonth();

            foreach ($employees as $employee) {
                $this->calculateEmployeePayslip($run, $employee, $components, $payrollDate);
            }

            return $run;
        });
    }

    /**
     * Calculate and save a payslip for a single employee.
     */
    protected function calculateEmployeePayslip(PayrollRun $run, Employee $employee, $components, Carbon $payrollDate)
    {
        $basicSalary = 0;
        $totalEarnings = 0;
        $totalDeductions = 0;
        $componentsDetail = [];

        // 1. Process standard components
        foreach ($components as $component) {
            $amount = $component->default_amount;
            
            $componentsDetail[] = [
                'name' => $component->name,
                'type' => $component->type,
                'amount' => $amount,
                'is_taxable' => $component->is_taxable,
            ];

            if ($component->type === 'earning') {
                $totalEarnings += $amount;
                if (strtolower($component->name) === 'basic salary' || strtolower($component->code) === 'base') {
                    $basicSalary += $amount;
                }
            } else {
                $totalDeductions += $amount;
            }
        }

        // 2. Process Claims
        $approvedClaims = Claim::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereNull('payroll_run_id')
            ->get();

        $claimsTotal = 0;
        foreach ($approvedClaims as $claim) {
            $claimsTotal += $claim->amount;
            $componentsDetail[] = [
                'name' => 'Reimbursement: ' . ($claim->claimCategory->name ?? 'Claim'),
                'type' => 'earning',
                'amount' => (float) $claim->amount,
                'is_taxable' => false,
            ];
            
            // Link claim to this run
            $claim->update(['payroll_run_id' => $run->id]);
        }
        $totalEarnings += $claimsTotal;

        // 3. Simplified BPJS Calculations (MVP logic)
        // In a real scenario, these come from BpjsRate model. We'll simulate standard rates here.
        // Cap for Kesehatan is usually ~12m, JP is ~10m.
        $bpjsKesehatanCap = 12000000;
        $bpjsJpCap = 10042300;
        
        $baseForKesehatan = min($basicSalary, $bpjsKesehatanCap);
        $baseForJp = min($basicSalary, $bpjsJpCap);
        
        $bpjsKesEmployee = $baseForKesehatan * 0.01;
        $bpjsKesEmployer = $baseForKesehatan * 0.04;
        
        $bpjsJhtEmployee = $basicSalary * 0.02;
        $bpjsJhtEmployer = $basicSalary * 0.037;
        
        $bpjsJpEmployee = $baseForJp * 0.01;
        $bpjsJpEmployer = $baseForJp * 0.02;

        // Total deductions from employee for BPJS
        $totalBpjsDeduction = $bpjsKesEmployee + $bpjsJhtEmployee + $bpjsJpEmployee;
        $totalDeductions += $totalBpjsDeduction;

        $componentsDetail[] = [
            'name' => 'BPJS Deductions',
            'type' => 'deduction',
            'amount' => $totalBpjsDeduction,
            'is_taxable' => false,
        ];

        // 4. Simplified PPh21 (TER method)
        // Determine category based on PTKP
        $terCategory = $this->determineTerCategory($employee->ptkp_status ?? 'TK/0');
        $taxableIncome = $totalEarnings - $claimsTotal; // Exclude reimbursements usually
        
        $pph21Rate = Pph21TerRate::where('category', $terCategory)
            ->where('income_range_start', '<=', $taxableIncome)
            ->where(function($q) use ($taxableIncome) {
                $q->where('income_range_end', '>=', $taxableIncome)
                  ->orWhereNull('income_range_end');
            })
            ->value('effective_rate') ?? 0;

        $pph21Amount = $taxableIncome * ($pph21Rate / 100);
        $totalDeductions += $pph21Amount;

        if ($pph21Amount > 0) {
            $componentsDetail[] = [
                'name' => 'PPh 21',
                'type' => 'deduction',
                'amount' => $pph21Amount,
                'is_taxable' => false,
            ];
        }

        $grossSalary = $totalEarnings;
        $netSalary = $grossSalary - $totalDeductions;

        // 5. Save Payslip
        Payslip::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            
            'basic_salary' => $basicSalary,
            'total_earnings' => $totalEarnings,
            'total_deductions' => $totalDeductions,
            'gross_salary' => $grossSalary,
            'net_salary' => $netSalary,
            'pph21_amount' => $pph21Amount,
            'bpjs_kesehatan_employee' => $bpjsKesEmployee,
            'bpjs_kesehatan_employer' => $bpjsKesEmployer,
            'bpjs_jht_employee' => $bpjsJhtEmployee,
            'bpjs_jht_employer' => $bpjsJhtEmployer,
            'bpjs_jp_employee' => $bpjsJpEmployee,
            'bpjs_jp_employer' => $bpjsJpEmployer,
            'components_detail' => $componentsDetail,
        ]);
    }

    /**
     * Map PTKP status to TER Category (A, B, C)
     */
    protected function determineTerCategory(string $ptkp): string
    {
        $ptkp = strtoupper($ptkp);
        
        // Category A: TK/0, TK/1, K/0
        if (in_array($ptkp, ['TK/0', 'TK/1', 'K/0'])) return 'A';
        
        // Category B: TK/2, TK/3, K/1, K/2
        if (in_array($ptkp, ['TK/2', 'TK/3', 'K/1', 'K/2'])) return 'B';
        
        // Category C: K/3
        if ($ptkp === 'K/3') return 'C';
        
        return 'A'; // Default fallback
    }
}
