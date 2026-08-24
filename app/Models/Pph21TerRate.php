<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pph21TerRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'category', 'income_range_start', 'income_range_end', 'effective_rate',
        'effective_from', 'effective_to',
    ];

    protected function casts(): array
    {
        return [
            'income_range_start' => 'decimal:2',
            'income_range_end' => 'decimal:2',
            'effective_rate' => 'decimal:6',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }
}
