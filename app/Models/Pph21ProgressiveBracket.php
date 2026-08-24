<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pph21ProgressiveBracket extends Model
{
    use HasFactory;

    protected $fillable = [
        'bracket_start', 'bracket_end', 'rate',
        'effective_from', 'effective_to',
    ];

    protected function casts(): array
    {
        return [
            'bracket_start' => 'decimal:2',
            'bracket_end' => 'decimal:2',
            'rate' => 'decimal:6',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }
}
