<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BpjsRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'program', 'employer_rate', 'employee_rate', 'salary_cap',
        'jkk_risk_class', 'effective_from', 'effective_to', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'employer_rate' => 'decimal:6',
            'employee_rate' => 'decimal:6',
            'salary_cap' => 'decimal:2',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }
}
