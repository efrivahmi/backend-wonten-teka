<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_security_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type');
            $table->string('attempted_action');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('face_match_score', 5, 4)->nullable();
            $table->string('address')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('detected_at');
            $table->timestamps();

            $table->index(['event_type', 'detected_at']);
            $table->index(['employee_id', 'detected_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_security_events');
    }
};
