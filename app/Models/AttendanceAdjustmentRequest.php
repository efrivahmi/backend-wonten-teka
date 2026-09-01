<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Models\Traits\BelongsToCompany;
use App\Models\Traits\Approvable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AttendanceAdjustmentRequest extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, Approvable;

    protected $fillable = [
        'company_id', 'employee_id', 'date', 'check_in', 'check_out', 'reason', 'status',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
