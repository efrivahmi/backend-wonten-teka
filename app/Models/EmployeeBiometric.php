<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class EmployeeBiometric extends Model
{

    protected $fillable = [
        'employee_id',

        'face_embedding',
        'web_face_embedding',
        'enrolled_at',
        'device_id',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
    ];

    /**
     * Encrypt the face embedding when saving.
     */
    public function setFaceEmbeddingAttribute($value)
    {
        $this->attributes['face_embedding'] = Crypt::encryptString(json_encode($value));
    }

    /**
     * Decrypt the face embedding when retrieving.
     */
    public function getFaceEmbeddingAttribute($value)
    {
        if (!$value) return null;
        $decoded = json_decode(Crypt::decryptString($value), true);
        return is_string($decoded) ? json_decode($decoded, true) : $decoded;
    }

    public function setWebFaceEmbeddingAttribute($value): void
    {
        $this->attributes['web_face_embedding'] = Crypt::encryptString(json_encode($value));
    }

    public function getWebFaceEmbeddingAttribute($value): ?array
    {
        return $value ? json_decode(Crypt::decryptString($value), true) : null;
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
