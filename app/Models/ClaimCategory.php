<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClaimCategory extends Model
{
    use HasFactory, BelongsToCompany;

    protected $fillable = [
        'company_id', 'name', 'monthly_limit', 'requires_receipt', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'monthly_limit' => 'decimal:2',
            'requires_receipt' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function claims(): HasMany
    {
        return $this->hasMany(Claim::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
