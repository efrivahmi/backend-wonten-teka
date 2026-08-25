<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    /**
     * Get a list of all payroll runs.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $runs = PayrollRun::where('company_id', $user->company_id)
            ->withCount('payslips')
            ->orderBy('period_year', 'desc')
            ->orderBy('period_month', 'desc')
            ->paginate(15);
            
        return response()->json($runs);
    }

    /**
     * Generate a new payroll run for the given month and year.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'period_month' => 'required|integer|min:1|max:12',
            'period_year' => 'required|integer|min:2020|max:2030',
        ]);

        $month = $validated['period_month'];
        $year = $validated['period_year'];

        // Check if payroll already run for this period
        $existingRun = PayrollRun::where('company_id', $user->company_id)
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->first();

        if ($existingRun) {
            return response()->json(['message' => 'Payroll for this period already exists.'], 422);
        }

        try {
            DB::beginTransaction();

            $run = PayrollRun::create([
                'company_id' => $user->company_id,
                'period_month' => $month,
                'period_year' => $year,
                'status' => 'draft',
                'run_by' => $user->id,
            ]);

            // Fetch active employees
            $employees = Employee::where('company_id', $user->company_id)->where('status', 'active')->get();

            foreach ($employees as $emp) {
                // Simplified MVP Payroll Calculation
                $basicSalary = $emp->basic_salary ?? 0;
                
                // Assume 100% attendance, some dummy allowances
                $allowance = $basicSalary * 0.1; // 10% allowance
                $grossSalary = $basicSalary + $allowance;
                
                // Deductions (BPJS MVP, flat 3% deduction)
                $bpjsEmployee = $basicSalary * 0.03;
                $pph21 = 0; // Skip PPh21 for MVP simplicity unless configured
                
                $totalDeductions = $bpjsEmployee + $pph21;
                $netSalary = $grossSalary - $totalDeductions;

                Payslip::create([
                    'payroll_run_id' => $run->id,
                    'employee_id' => $emp->id,
                    'company_id' => $user->company_id,
                    'basic_salary' => $basicSalary,
                    'total_earnings' => $allowance,
                    'total_deductions' => $totalDeductions,
                    'gross_salary' => $grossSalary,
                    'net_salary' => $netSalary,
                    'pph21_amount' => $pph21,
                    'bpjs_kesehatan_employee' => $basicSalary * 0.01,
                    'bpjs_jht_employee' => $basicSalary * 0.02,
                    'components_detail' => [
                        'earnings' => [
                            ['name' => 'Gaji Pokok', 'amount' => $basicSalary],
                            ['name' => 'Tunjangan Transport', 'amount' => $allowance],
                        ],
                        'deductions' => [
                            ['name' => 'BPJS Kesehatan', 'amount' => $basicSalary * 0.01],
                            ['name' => 'BPJS Ketenagakerjaan', 'amount' => $basicSalary * 0.02],
                        ]
                    ],
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Payroll run generated successfully.',
                'data' => $run
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to generate payroll.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get details of a specific payroll run.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $run = PayrollRun::where('id', $id)
            ->where('company_id', $user->company_id)
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
