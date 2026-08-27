<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use App\Models\Traits\Approvable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimeRequest extends Model
{
    use HasFactory, BelongsToCompany, Approvable;

    protected $fillable = [
        'company_id', 'employee_id', 'date', 'start_time', 'end_time', 'reason', 'status',
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
