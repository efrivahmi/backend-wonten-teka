<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PtkpThreshold extends Model
{
    use HasFactory;

    protected $fillable = [
        'status', 'annual_threshold',
        'effective_from', 'effective_to',
    ];

    protected function casts(): array
    {
        return [
            'annual_threshold' => 'decimal:2',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }
}
