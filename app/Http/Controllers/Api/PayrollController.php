<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollRun;
use Illuminate\Http\Request;
use App\Services\PayrollService;
use Illuminate\Validation\ValidationException;

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
            ->paginate(15);
            
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
            'period_year' => 'required|integer|min:2020|max:2030',
        ]);

        $month = $validated['period_month'];
        $year = $validated['period_year'];

        // Check if payroll already run for this period
        $existingRun = PayrollRun::query()
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->first();

        if ($existingRun) {
            return response()->json(['message' => 'Payroll for this period already exists.'], 422);
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
        
        $summary = [
            'total_employees' => $run->payslips->count(),
            'total_basic_salary' => $totalBasic,
            'total_earnings' => $totalEarnings,
            'total_deductions' => $totalDeductions,
            'total_net_salary' => $totalNet,
        ];

        return response()->json([
            'run' => $run,
            'summary' => $summary,
            'payslips' => $run->payslips,
        ]);
    }
}
