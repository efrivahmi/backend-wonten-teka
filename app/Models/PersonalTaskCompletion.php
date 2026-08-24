<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersonalTaskCompletion extends Model
{
    use HasFactory;

    protected $fillable = ['personal_task_id', 'completed_date'];

    protected function casts(): array
    {
        return ['completed_date' => 'date'];
    }

    public function personalTask(): BelongsTo
    {
        return $this->belongsTo(PersonalTask::class);
    }
}
