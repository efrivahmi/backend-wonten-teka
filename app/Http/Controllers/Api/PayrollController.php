<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollRun;
use App\Models\Notification;
use Illuminate\Http\Request;
use App\Services\PayrollService;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    /**
     * Get a list of all payroll runs.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $runs = PayrollRun::query()
            ->withCount('payslips')
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
            $run = $payrollService->generatePayrollRun($month, $year, $user->id);

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
    public function show(Request $request, $id)
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
        if ($run->status !== 'finalized') {
            return response()->json(['message' => 'Hanya payroll yang sudah difinalisasi yang dapat ditandai telah dibayar.'], 422);
        }

        $run->update(['status' => 'paid', 'paid_at' => now()]);
        return response()->json(['message' => 'Payroll ditandai telah dibayar.', 'data' => $run->fresh()]);
    }
}
