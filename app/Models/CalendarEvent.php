<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class CalendarEvent extends Model
{
    use HasFactory;

    protected $fillable = [
 'title', 'description', 'type', 'scope', 'department',
        'start_date', 'end_date', 'start_time', 'end_time',
        'is_recurring', 'recurrence_rule', 'created_by', 'is_active',
    ];

    protected $appends = ['status'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_recurring' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeHolidays($query)
    {
        return $query->where('type', 'holiday');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('is_active', true)->where('end_date', '>=', today());
    }

    public function getStatusAttribute(): string
    {
        $timezone = config('app.business_timezone', 'Asia/Jakarta');
        $now = now($timezone);
        $endDate = Carbon::parse($this->end_date?->toDateString() ?? $this->start_date?->toDateString(), $timezone);
        $endsAt = $endDate->copy();
        if ($this->end_time) {
            [$hour, $minute, $second] = array_pad(explode(':', (string) $this->end_time), 3, 0);
            $endsAt->setTime((int) $hour, (int) $minute, (int) $second);
        } else {
            $endsAt->endOfDay();
        }

        if ($now->greaterThanOrEqualTo($endsAt)) {
            return 'completed';
        }
        if (!$this->is_active) {
            return 'inactive';
        }

        $startDate = Carbon::parse($this->start_date?->toDateString(), $timezone);
        if ($startDate->isAfter($now->copy()->startOfDay())) {
            return 'scheduled';
        }
        if ($this->start_time && $startDate->isSameDay($now)) {
            [$hour, $minute, $second] = array_pad(explode(':', (string) $this->start_time), 3, 0);
            if ($now->lt($now->copy()->setTime((int) $hour, (int) $minute, (int) $second))) {
                return 'scheduled';
            }
        }

        return 'active';
    }
}
