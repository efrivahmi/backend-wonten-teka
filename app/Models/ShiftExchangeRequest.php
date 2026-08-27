<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use App\Models\Traits\Approvable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftExchangeRequest extends Model
{
    use HasFactory, BelongsToCompany, Approvable;

    protected $fillable = [
        'company_id', 'requesting_employee_id', 'target_employee_id', 
        'original_date', 'proposed_date', 'reason', 'status',
    ];

    protected function casts(): array
    {
        return [
            'original_date' => 'date',
            'proposed_date' => 'date',
        ];
    }

    public function requestingEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'requesting_employee_id');
    }

    public function targetEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'target_employee_id');
    }
}
