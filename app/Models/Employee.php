<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Crypt;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [

        'user_id',
        'full_name',
        'employee_number',
        'nik_encrypted',
        'npwp_encrypted',
        'phone',
        'email',
        'date_of_birth',
        'gender',
        'address',
        'photo_url',
        'department',
        'position',
        'join_date',
        'employment_status',
        'is_active',
        'ptkp_status',
        'bpjs_kesehatan_number_encrypted',
        'bpjs_ketenagakerjaan_number_encrypted',
        'bank_name',
        'bank_account_number_encrypted',
        'bank_account_holder',
        'face_embedding_encrypted',
        'face_enrolled',
        'face_enrolled_at',
    ];

    protected $hidden = [
        'nik_encrypted',
        'npwp_encrypted',
        'bpjs_kesehatan_number_encrypted',
        'bpjs_ketenagakerjaan_number_encrypted',
        'bank_account_number_encrypted',
        'face_embedding_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'join_date' => 'date',
            'is_active' => 'boolean',
            'face_enrolled' => 'boolean',
            'face_enrolled_at' => 'datetime',
        ];
    }

    // Encrypted field accessors
    public function getNikAttribute(): ?string
    {
        return $this->nik_encrypted ? Crypt::decryptString($this->nik_encrypted) : null;
    }

    public function setNikAttribute(?string $value): void
    {
        $this->attributes['nik_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getNpwpAttribute(): ?string
    {
        return $this->npwp_encrypted ? Crypt::decryptString($this->npwp_encrypted) : null;
    }

    public function setNpwpAttribute(?string $value): void
    {
        $this->attributes['npwp_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getBpjsKesehatanNumberAttribute(): ?string
    {
        return $this->bpjs_kesehatan_number_encrypted ? Crypt::decryptString($this->bpjs_kesehatan_number_encrypted) : null;
    }

    public function setBpjsKesehatanNumberAttribute(?string $value): void
    {
        $this->attributes['bpjs_kesehatan_number_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getBpjsKetenagakerjaanNumberAttribute(): ?string
    {
        return $this->bpjs_ketenagakerjaan_number_encrypted ? Crypt::decryptString($this->bpjs_ketenagakerjaan_number_encrypted) : null;
    }

    public function setBpjsKetenagakerjaanNumberAttribute(?string $value): void
    {
        $this->attributes['bpjs_ketenagakerjaan_number_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getBankAccountNumberAttribute(): ?string
    {
        return $this->bank_account_number_encrypted ? Crypt::decryptString($this->bank_account_number_encrypted) : null;
    }

    public function setBankAccountNumberAttribute(?string $value): void
    {
        $this->attributes['bank_account_number_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function activeDevice(): HasOne
    {
        return $this->hasOne(Device::class)->where('status', 'active');
    }

    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(AttendanceLog::class);
    }

    public function shiftAssignments(): HasMany
    {
        return $this->hasMany(ShiftAssignment::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function claims(): HasMany
    {
        return $this->hasMany(Claim::class);
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function personalTasks(): HasMany
    {
        return $this->hasMany(PersonalTask::class);
    }

    public function biometric(): HasOne
    {
        return $this->hasOne(EmployeeBiometric::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInDepartment($query, string $department)
    {
        return $query->where('department', $department);
    }
}
