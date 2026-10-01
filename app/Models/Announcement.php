<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Announcement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title', 'body', 'attachment_url', 'target_type', 'target_value',
        'priority', 'created_by', 'published_at', 'expires_at', 'is_active',
    ];

    protected $appends = ['attachment_full_url', 'status'];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Return a fully-qualified public URL for the attachment.
     * Returns null when no attachment has been uploaded.
     */
    public function getAttachmentFullUrlAttribute(): ?string
    {
        if (empty($this->attachment_url)) {
            return null;
        }
        // Already a full URL (e.g. http/https)
        if (str_starts_with($this->attachment_url, 'http')) {
            return $this->attachment_url;
        }
        return Storage::disk('public')->url($this->attachment_url);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function acknowledgments(): HasMany
    {
        return $this->hasMany(AnnouncementAcknowledgment::class);
    }

    public function scopeUrgent($query)
    {
        return $query->where('priority', 'urgent');
    }

    public function scopeActive($query)
    {
        $now = now('UTC');

        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', $now))
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now));
    }

    public function getStatusAttribute(): string
    {
        $now = now('UTC');
        if ($this->expires_at && $this->expires_at->copy()->utc()->lte($now)) {
            return 'expired';
        }
        if (!$this->is_active) {
            return 'inactive';
        }
        if ($this->published_at && $this->published_at->copy()->utc()->gt($now)) {
            return 'scheduled';
        }

        return 'active';
    }
}
