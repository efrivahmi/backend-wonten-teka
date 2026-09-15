<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceSecurityEvent extends Model
{
    protected $fillable = [
        'employee_id',
        'device_id',
        'event_type',
        'attempted_action',
        'latitude',
        'longitude',
        'face_match_score',
        'address',
        'metadata',
        'detected_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'face_match_score' => 'decimal:4',
            'metadata' => 'array',
            'detected_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
