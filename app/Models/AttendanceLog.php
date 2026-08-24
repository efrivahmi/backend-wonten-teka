<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    use HasFactory, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'employee_id',
        'device_id',
        'shift_assignment_id',
        'check_in_at',
        'check_in_latitude',
        'check_in_longitude',
        'check_in_face_score',
        'check_in_photo_url',
        'check_out_at',
        'check_out_latitude',
        'check_out_longitude',
        'check_out_face_score',
        'check_out_photo_url',
        'status',
        'flags',
        'is_flagged',
        'notes',
        'admin_notes',
        'work_duration_minutes',
    ];

    protected function casts(): array
    {
        return [
            'check_in_at' => 'datetime',
            'check_out_at' => 'datetime',
            'check_in_latitude' => 'decimal:7',
            'check_in_longitude' => 'decimal:7',
            'check_out_latitude' => 'decimal:7',
            'check_out_longitude' => 'decimal:7',
            'check_in_face_score' => 'decimal:4',
            'check_out_face_score' => 'decimal:4',
            'flags' => 'array',
            'is_flagged' => 'boolean',
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

    public function shiftAssignment(): BelongsTo
    {
        return $this->belongsTo(ShiftAssignment::class);
    }

    // Scopes
    public function scopeToday($query)
    {
        return $query->whereDate('check_in_at', today());
    }

    public function scopeFlagged($query)
    {
        return $query->where('is_flagged', true);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
