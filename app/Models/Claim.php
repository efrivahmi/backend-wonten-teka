<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Claim extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    protected $fillable = [
        'company_id', 'employee_id', 'claim_category_id', 'amount', 'receipt_url',
        'description', 'expense_date', 'status', 'rejection_reason', 'payroll_run_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expense_date' => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function claimCategory(): BelongsTo
    {
        return $this->belongsTo(ClaimCategory::class);
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function approvalInstance(): MorphOne
    {
        return $this->morphOne(ApprovalInstance::class, 'approvable');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
