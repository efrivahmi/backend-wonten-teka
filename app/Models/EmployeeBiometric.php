<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class EmployeeBiometric extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'employee_id',
        'company_id',
        'face_embedding',
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
        return json_decode(Crypt::decryptString($value), true);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
