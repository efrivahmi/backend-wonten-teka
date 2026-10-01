<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\Employee;
use App\Models\Claim;
use App\Models\Setting;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Services\PayrollService;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function eligibleEmployees(Request $request)
    {
        abort_unless($request->user()->hasAnyRole(['super_admin', 'admin']), 403);
        $employees = Employee::active()->orderBy('full_name')->get(['id', 'full_name', 'employee_number']);
        return response()->json(['data' => $employees]);
    }

    public function storeManual(Request $request)
    {
        abort_unless($request->user()->hasAnyRole(['super_admin', 'admin']), 403);
        $settings = Setting::where('key', 'payroll_config')->first()?->value ?? [];
        $settings = is_array($settings) ? $settings : [];

        $validated = $request->validate([
            'period_month' => 'required|integer|min:1|max:12',
            'period_year' => 'required|integer|min:2020|max:2100',
            'period_start' => 'required|date_format:Y-m-d',
            'period_end' => 'required|date_format:Y-m-d|after_or_equal:period_start',
            'scheduled_payment_date' => 'required|date_format:Y-m-d',
            'employees' => 'required|array|min:1',
            'employees.*.employee_id' => 'required|integer|distinct|exists:employees,id',
            'employees.*.net_amount' => 'required|numeric|gt:0|max:999999999999',
            'custom_deductions' => 'sometimes|array|max:20',
            'custom_deductions.*.name' => 'required|string|max:100',
            'custom_deductions.*.amount' => 'required|numeric|gt:0|max:999999999999',
        ]);
        $customDeductions = $validated['custom_deductions'] ?? [];
        $employeeIds = collect($validated['employees'])->pluck('employee_id');
        $employees = Employee::active()->whereIn('id', $employeeIds)->get()->keyBy('id');
        if ($employees->count() !== $employeeIds->count()) {
            return response()->json(['message' => 'Daftar memuat karyawan nonaktif atau tidak ditemukan. Muat ulang daftar karyawan.'], 422);
        }

        $month = (int) $validated['period_month'];
        $year = (int) $validated['period_year'];
        $existing = PayrollRun::where('period_month', $month)->where('period_year', $year)->first();
        if ($existing && $existing->status !== 'draft') {
            return response()->json(['message' => 'Payroll periode ini sudah diterbitkan dan tidak dapat dibuat ulang.'], 422);
        }

        $periodStart = Carbon::createFromFormat('!Y-m-d', $validated['period_start']);
        $periodEnd = Carbon::createFromFormat('!Y-m-d', $validated['period_end']);
        $paymentDate = Carbon::createFromFormat('!Y-m-d', $validated['scheduled_payment_date']);

        $run = DB::transaction(function () use ($request, $existing, $validated, $settings, $periodStart, $periodEnd, $paymentDate, $employees, $month, $year, $customDeductions) {
            $run = $existing ?? new PayrollRun(['period_month' => $month, 'period_year' => $year]);
            if ($run->exists) {
                Claim::where('payroll_run_id', $run->id)->update(['payroll_run_id' => null]);
                $run->payslips()->delete();
            }
            $snapshot = array_merge($settings, [
                'payroll_mode' => 'manual_amount_before_custom_deductions',
                'custom_deductions' => $customDeductions,
                'attendance_deduction_enabled' => false,
                'pph21_enabled' => false,
                'bpjs_enabled' => false,
                'bpjs_kesehatan_enabled' => false,
                'bpjs_jht_enabled' => false,
                'bpjs_jp_enabled' => false,
                'bpjs_jkk_enabled' => false,
                'bpjs_jkm_enabled' => false,
            ]);
            $run->fill([
                'status' => 'draft',
                'run_by' => $request->user()->id,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'scheduled_payment_date' => $paymentDate->toDateString(),
                'configuration_snapshot' => $snapshot,
            ])->save();

            foreach ($validated['employees'] as $entry) {
                $amount = round((float) $entry['net_amount'], 2);
                $customDeductionTotal = round(collect($customDeductions)->sum('amount'), 2);
                if ($customDeductionTotal > $amount) {
                    throw ValidationException::withMessages([
                        'custom_deductions' => 'Total potongan khusus tidak boleh melebihi gaji sebelum potongan untuk setiap karyawan.',
                    ]);
                }
                $components = [[
                    'name' => 'Jumlah gaji sebelum potongan khusus (input keuangan)',
                    'type' => 'earning',
                    'amount' => $amount,
                    'is_taxable' => false,
                ]];
                foreach ($customDeductions as $deduction) {
                    $components[] = [
                        'name' => $deduction['name'],
                        'type' => 'deduction',
                        'amount' => round((float) $deduction['amount'], 2),
                        'is_taxable' => false,
                        'custom' => true,
                    ];
                }
                $netAmount = round($amount - $customDeductionTotal, 2);
                $run->payslips()->create([
                    'employee_id' => $employees->get($entry['employee_id'])->id,
                    'basic_salary' => 0,
                    'total_earnings' => $amount,
                    'total_deductions' => $customDeductionTotal,
                    'gross_salary' => $amount,
                    'net_salary' => $netAmount,
                    'pph21_amount' => 0,
                    'attendance_absence_days' => 0,
                    'attendance_deduction_amount' => 0,
                    'components_detail' => $components,
                ]);
            }
            return $run->fresh()->loadCount('payslips');
        });

        return response()->json(['message' => 'Draf payroll manual berhasil dibuat tanpa perhitungan potongan otomatis.', 'data' => $run], 201);
    }

    /**
     * Get a list of all payroll runs.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $filters = $request->validate([
            'search' => 'nullable|string|max:100',
            'recap_from' => 'nullable|date_format:Y-m-d',
            'recap_to' => 'nullable|date_format:Y-m-d|after_or_equal:recap_from',
            'payment_from' => 'nullable|date_format:Y-m-d',
            'payment_to' => 'nullable|date_format:Y-m-d|after_or_equal:payment_from',
            'status' => 'nullable|in:draft,finalized,paid',
        ]);

        $runs = PayrollRun::query()
            ->withCount('payslips')
            ->withCount(['payslips as collected_count' => fn ($query) => $query->where('payment_status', 'collected')])
            ->withCount(['payslips as available_count' => fn ($query) => $query->where('payment_status', 'available')])
            ->when($filters['recap_from'] ?? null, fn ($query, $date) => $query->whereDate('period_end', '>=', $date))
            ->when($filters['recap_to'] ?? null, fn ($query, $date) => $query->whereDate('period_start', '<=', $date))
            ->when($filters['payment_from'] ?? null, fn ($query, $date) => $query->whereDate('scheduled_payment_date', '>=', $date))
            ->when($filters['payment_to'] ?? null, fn ($query, $date) => $query->whereDate('scheduled_payment_date', '<=', $date))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function ($query, $search) {
                $term = trim($search);
                $query->where(function ($query) use ($term) {
                    $query->where('status', 'like', "%{$term}%")
                        ->orWhereHas('payslips.employee', function ($employeeQuery) use ($term) {
                            $employeeQuery->where('full_name', 'like', "%{$term}%")
                                ->orWhere('employee_number', 'like', "%{$term}%");
                        });
                    if (ctype_digit($term)) {
                        $query->orWhere('period_month', (int) $term)
                            ->orWhere('period_year', (int) $term);
                    }
                });
            })
            ->orderBy('period_year', 'desc')
            ->orderBy('period_month', 'desc')
            ->paginate(min(500, max(1, (int) $request->query('per_page', 15))));
            
        return response()->json($runs);
    }

    /**
     * Generate a new payroll run for the given month and year.
     */
    public function store(Request $request, PayrollService $payrollService)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'period_month' => 'required|integer|min:1|max:12',
            'period_year' => 'required|integer|min:2020|max:2100',
            'custom_deductions' => 'sometimes|array|max:20',
            'custom_deductions.*.name' => 'required|string|max:100',
            'custom_deductions.*.amount' => 'required|numeric|gt:0|max:999999999999',
        ]);

        $month = $validated['period_month'];
        $year = $validated['period_year'];

        $existingRun = PayrollRun::query()
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->first();

        if ($existingRun && $existingRun->status !== 'draft') {
            return response()->json(['message' => 'Payroll periode ini sudah difinalisasi.'], 422);
        }

        try {
            $run = $payrollService->generatePayrollRun($month, $year, $user->id, $validated['custom_deductions'] ?? []);

            return response()->json([
                'message' => 'Payroll run generated successfully.',
                'data' => $run
            ], 201);

        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to generate payroll.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get details of a specific payroll run.
     */
    public function show(Request $request, int|string $id)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $run = PayrollRun::where('id', $id)
            
            ->with(['payslips.employee', 'runByUser'])
            ->firstOrFail();

        // Calculate summary
        $totalBasic = $run->payslips->sum('basic_salary');
        $totalEarnings = $run->payslips->sum('total_earnings');
        $totalDeductions = $run->payslips->sum('total_deductions');
        $totalNet = $run->payslips->sum('net_salary');
        $totalEmployerContributions = $run->payslips->sum(fn ($slip) =>
            (float) $slip->bpjs_kesehatan_employer + (float) $slip->bpjs_jht_employer
            + (float) $slip->bpjs_jp_employer + (float) $slip->bpjs_jkk_employer
            + (float) $slip->bpjs_jkm_employer + (float) $slip->bpjs_jkp_employer
        );
        
        $summary = [
            'total_employees' => $run->payslips->count(),
            'total_basic_salary' => $totalBasic,
            'manual_amount_only' => in_array(($run->configuration_snapshot['payroll_mode'] ?? null), ['manual_net_amount', 'manual_amount_before_custom_deductions'], true),
            'total_manual_amount' => $run->payslips->sum('gross_salary'),
            'total_earnings' => $totalEarnings,
            'total_deductions' => $totalDeductions,
            'total_net_salary' => $totalNet,
            'total_employer_contributions' => $totalEmployerContributions,
        ];

        return response()->json([
            'run' => $run,
            'summary' => $summary,
            'payslips' => $run->payslips,
        ]);
    }

    public function finalize(Request $request, PayrollRun $run)
    {
        abort_unless($request->user()->hasAnyRole(['super_admin', 'admin']), 403);
        if ($run->status !== 'draft' || !$run->payslips()->exists()) {
            return response()->json(['message' => 'Hanya payroll draf yang berisi slip dapat difinalisasi.'], 422);
        }

        DB::transaction(function () use ($run) {
            $run->update(['status' => 'finalized', 'finalized_at' => now()]);
            $run->payslips()->where('payment_status', 'pending')->update([
                'payment_status' => 'available',
                'payment_available_at' => now(),
            ]);
            $period = $run->period_month.'/'.$run->period_year;
            $run->payslips()->with('employee.user')->get()->each(function ($payslip) use ($period, $run) {
                $user = $payslip->employee?->user;
                if (!$user) return;
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'payroll',
                    'title' => 'Slip gaji tersedia',
                    'body' => "Slip gaji periode {$period} sudah dapat dilihat.",
                    'data' => ['payroll_run_id' => $run->id, 'payslip_id' => $payslip->id],
                    'action_url' => '/employee/payslip',
                ]);
            });
        });
        return response()->json(['message' => 'Payroll difinalisasi dan slip gaji kini tersedia untuk karyawan.', 'data' => $run->fresh()]);
    }

    public function markPaid(Request $request, PayrollRun $run)
    {
        abort_unless($request->user()->hasAnyRole(['super_admin', 'admin']), 403);
        if ($run->status === 'paid') {
            return response()->json(['message' => 'Seluruh slip periode ini sudah dibayar.', 'data' => $run]);
        }
        return response()->json(['message' => 'Status dibayar mengikuti konfirmasi pengambilan setiap slip. Tandai slip karyawan satu per satu.', 'data' => $run], 422);
    }

    public function markSlipCollected(Request $request, Payslip $payslip)
    {
        abort_unless($request->user()->hasAnyRole(['super_admin', 'admin']), 403);
        $validated = $request->validate([
            'payment_method' => 'sometimes|required|in:cash,transfer',
            'payment_reference' => 'nullable|string|max:120',
        ]);
        $paymentMethod = $validated['payment_method'] ?? 'cash';

        return DB::transaction(function () use ($request, $payslip, $validated, $paymentMethod) {
            $run = PayrollRun::whereKey($payslip->payroll_run_id)->lockForUpdate()->firstOrFail();
            $slip = Payslip::whereKey($payslip->id)->lockForUpdate()->firstOrFail();

            if ($slip->payment_status === 'collected') {
                return response()->json(['message' => 'Slip ini sudah ditandai lunas.', 'data' => $slip->load('employee')], 422);
            }
            if ($run->status !== 'finalized') {
                return response()->json(['message' => 'Slip baru dapat diambil setelah payroll difinalisasi.'], 422);
            }
            if ($slip->payment_status !== 'available') {
                return response()->json(['message' => 'Slip ini belum tersedia untuk diambil.'], 422);
            }

            $slip->update([
                'payment_status' => 'collected',
                'payment_method' => $paymentMethod,
                'payment_reference' => $paymentMethod === 'transfer' ? ($validated['payment_reference'] ?? null) : null,
                'paid_at' => now(),
                'collected_at' => $paymentMethod === 'cash' ? now() : null,
                'collected_by' => $request->user()->id,
            ]);

            if (!$run->payslips()->where('payment_status', '!=', 'collected')->exists()) {
                $run->update(['status' => 'paid', 'paid_at' => now()]);
            }

            return response()->json([
                'message' => $paymentMethod === 'transfer'
                    ? 'Transfer gaji berhasil dicatat.'
                    : 'Pembayaran gaji tunai berhasil dicatat.',
                'data' => $slip->fresh()->load('employee'),
                'run' => $run->fresh(),
            ]);
        });
    }
}
