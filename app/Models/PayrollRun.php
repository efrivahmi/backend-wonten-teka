<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    use HasFactory;

    protected $fillable = [
 'period_month', 'period_year', 'status',
        'run_by', 'finalized_at', 'paid_at', 'notes', 'period_start', 'period_end', 'scheduled_payment_date', 'configuration_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'finalized_at' => 'datetime',
            'paid_at' => 'datetime',
            'period_start' => 'date',
            'period_end' => 'date',
            'scheduled_payment_date' => 'date',
            'configuration_snapshot' => 'array',
        ];
    }

    public function runByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'run_by');
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeFinalized($query)
    {
        return $query->where('status', 'finalized');
    }
}
