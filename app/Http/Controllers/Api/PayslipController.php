<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payslip;
use Carbon\Carbon;
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
            ->whereHas('payrollRun', fn ($query) => $query->whereIn('status', ['finalized', 'paid']))
            ->with(['payrollRun' => function ($query) {
                $query->select('id', 'period_month', 'period_year', 'period_start', 'period_end', 'status');
            }])
            ->orderByDesc('payroll_run_id')
            ->paginate(25);

        $payslips->getCollection()->each(fn ($slip) => $this->appendPublishedPeriod($slip));
            
        return response()->json($payslips);
    }

    /**
     * View details of a specific payslip.
     */
    public function show(Request $request, Payslip $payslip)
    {
        $employee = $request->user()->employee;
        
        if (!$employee || (int) $payslip->employee_id !== (int) $employee->id || !$payslip->payrollRun || !in_array($payslip->payrollRun->status, ['finalized', 'paid'], true)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $payslip->load('payrollRun');
        $this->appendPublishedPeriod($payslip);
        return response()->json($payslip);
    }

    /**
     * Download the payslip as a PDF.
     */
    public function download(Request $request, Payslip $payslip)
    {
        $employee = $request->user()->employee;
        
        $payslip->load('payrollRun');
        if (!$employee || (int) $payslip->employee_id !== (int) $employee->id || !$payslip->payrollRun || !in_array($payslip->payrollRun->status, ['finalized', 'paid'], true)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Using barryvdh/laravel-dompdf for PDF generation.
        // In a real application, you'd load a dedicated blade view.
        $escape = fn ($value) => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $details = collect($payslip->components_detail ?? [])->map(fn ($item) => '<tr><td>'.$escape($item['name'] ?? 'Komponen').'</td><td>'.$escape(ucfirst($item['type'] ?? '')).'</td><td style="text-align:right">Rp '.number_format((float) ($item['amount'] ?? 0), 0, ',', '.').'</td></tr>')->implode('');
        $period = $payslip->payrollRun->period_start && $payslip->payrollRun->period_end
            ? $payslip->payrollRun->period_start->format('d/m/Y').' – '.$payslip->payrollRun->period_end->format('d/m/Y')
            : $payslip->payrollRun->period_month.'/'.$payslip->payrollRun->period_year;
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML('<html><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;color:#17352b}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd}h1{color:#08784f}</style><h1>Slip Gaji</h1><p>'. $escape($employee->full_name).' · '.$escape($employee->employee_number).'</p><p>Periode: '.$escape($period).'</p><table><thead><tr><th>Komponen</th><th>Jenis</th><th>Jumlah</th></tr></thead><tbody>'.$details.'</tbody></table><h3>Penghasilan bruto: Rp '.number_format((float) $payslip->gross_salary, 0, ',', '.').'</h3><h3>Total potongan: Rp '.number_format((float) $payslip->total_deductions, 0, ',', '.').'</h3><h2>Gaji bersih: Rp '.number_format((float) $payslip->net_salary, 0, ',', '.').'</h2>');

        $filename = "Payslip_" . $payslip->payrollRun->period_year . "_" . $payslip->payrollRun->period_month . ".pdf";
        
        return $pdf->download($filename);
    }

    private function appendPublishedPeriod(Payslip $payslip): void
    {
        $run = $payslip->payrollRun;
        if (!$run) return;
        $payslip->setAttribute('status', 'published');
        $payslip->setAttribute('period_start', $run->period_start?->toDateString() ?? Carbon::create($run->period_year, $run->period_month, 1)->toDateString());
        $payslip->setAttribute('period_end', $run->period_end?->toDateString() ?? Carbon::create($run->period_year, $run->period_month, 1)->endOfMonth()->toDateString());
    }
}
