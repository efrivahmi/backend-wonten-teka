<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('shift_assignment_id')->nullable()->constrained()->nullOnDelete();

            // Check-in data
            $table->timestamp('check_in_at')->nullable();
            $table->decimal('check_in_latitude', 10, 7)->nullable();
            $table->decimal('check_in_longitude', 10, 7)->nullable();
            $table->decimal('check_in_face_score', 5, 4)->nullable(); // 0.0000 to 1.0000
            $table->string('check_in_photo_url')->nullable();

            // Check-out data
            $table->timestamp('check_out_at')->nullable();
            $table->decimal('check_out_latitude', 10, 7)->nullable();
            $table->decimal('check_out_longitude', 10, 7)->nullable();
            $table->decimal('check_out_face_score', 5, 4)->nullable();
            $table->string('check_out_photo_url')->nullable();

            // Status & flags
            $table->string('status')->default('present'); // present, late, early_leave, absent, on_leave
            $table->json('flags')->nullable(); // mock_location, root_detected, impossible_travel, low_face_score, etc.
            $table->boolean('is_flagged')->default(false);
            $table->text('notes')->nullable();
            $table->text('admin_notes')->nullable(); // HR review notes

            // Work duration (calculated)
            $table->integer('work_duration_minutes')->nullable();

            $table->timestamps();

            // Immutable — no soft deletes on attendance logs
            $table->index(['employee_id', 'check_in_at']);
            $table->index(['check_in_at']);
            $table->index(['status']);
            $table->index('is_flagged');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
