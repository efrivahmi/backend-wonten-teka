<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payslip;
use Illuminate\Http\Request;

class PayslipController extends Controller
{
    /**
     * Get the employee's payslip history.
     */
    public function history(Request $request)
    {
        $employee = $request->user()->employee;
        
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $payslips = Payslip::where('employee_id', $employee->id)
            ->with(['payrollRun' => function ($query) {
                $query->select('id', 'period_month', 'period_year', 'status');
            }])
            ->orderBy('created_at', 'desc')
            ->paginate(12); // A year of payslips per page
            
        return response()->json($payslips);
    }

    /**
     * View details of a specific payslip.
     */
    public function show(Request $request, Payslip $payslip)
    {
        $employee = $request->user()->employee;
        
        if (!$employee || $payslip->employee_id !== $employee->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json($payslip->load('payrollRun'));
    }

    /**
     * Download the payslip as a PDF.
     */
    public function download(Request $request, Payslip $payslip)
    {
        $employee = $request->user()->employee;
        
        if (!$employee || $payslip->employee_id !== $employee->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Using barryvdh/laravel-dompdf for PDF generation.
        // In a real application, you'd load a dedicated blade view.
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML("
            <h1>Payslip - " . $payslip->payrollRun->period_month . "/" . $payslip->payrollRun->period_year . "</h1>
            <p><strong>Employee:</strong> " . $employee->full_name . "</p>
            <p><strong>Net Salary:</strong> Rp " . number_format($payslip->net_salary, 2) . "</p>
            <hr>
            <h3>Earnings</h3>
            <p>Gross Salary: Rp " . number_format($payslip->gross_salary, 2) . "</p>
            <h3>Deductions</h3>
            <p>Total Deductions: Rp " . number_format($payslip->total_deductions, 2) . "</p>
        ");

        $filename = "Payslip_" . $payslip->payrollRun->period_year . "_" . $payslip->payrollRun->period_month . ".pdf";
        
        return $pdf->download($filename);
    }
}
