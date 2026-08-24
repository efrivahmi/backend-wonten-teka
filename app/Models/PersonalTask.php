<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PersonalTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id', 'title', 'description', 'recurrence_rule',
        'reminder_time', 'streak_count', 'longest_streak', 'last_completed_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'last_completed_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function completions(): HasMany
    {
        return $this->hasMany(PersonalTaskCompletion::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
