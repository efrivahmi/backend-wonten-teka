<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollComponent extends Model
{
    use HasFactory;

    protected $fillable = [
 'name', 'code', 'type', 'is_taxable',
        'default_amount', 'applies_to', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'default_amount' => 'decimal:2',
            'is_taxable' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function scopeEarnings($query)
    {
        return $query->where('type', 'earning');
    }

    public function scopeDeductions($query)
    {
        return $query->where('type', 'deduction');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
