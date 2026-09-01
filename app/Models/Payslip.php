<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payslip extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_run_id', 'employee_id',
        'basic_salary', 'total_earnings', 'total_deductions', 'gross_salary', 'net_salary',
        'pph21_amount',
        'bpjs_kesehatan_employee', 'bpjs_kesehatan_employer',
        'bpjs_jht_employee', 'bpjs_jht_employer',
        'bpjs_jp_employee', 'bpjs_jp_employer',
        'bpjs_jkk_employer', 'bpjs_jkm_employer',
        'tapera_employee', 'tapera_employer',
        'components_detail', 'pdf_url',
    ];

    protected function casts(): array
    {
        return [
            'basic_salary' => 'decimal:2',
            'total_earnings' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'gross_salary' => 'decimal:2',
            'net_salary' => 'decimal:2',
            'pph21_amount' => 'decimal:2',
            'bpjs_kesehatan_employee' => 'decimal:2',
            'bpjs_kesehatan_employer' => 'decimal:2',
            'bpjs_jht_employee' => 'decimal:2',
            'bpjs_jht_employer' => 'decimal:2',
            'bpjs_jp_employee' => 'decimal:2',
            'bpjs_jp_employer' => 'decimal:2',
            'bpjs_jkk_employer' => 'decimal:2',
            'bpjs_jkm_employer' => 'decimal:2',
            'tapera_employee' => 'decimal:2',
            'tapera_employer' => 'decimal:2',
            'components_detail' => 'array',
        ];
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
