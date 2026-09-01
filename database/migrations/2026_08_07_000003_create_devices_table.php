<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('device_fingerprint');
            $table->string('device_name')->nullable();
            $table->string('device_model')->nullable();
            $table->string('os_version')->nullable();
            $table->string('app_version')->nullable();
            $table->text('fcm_token')->nullable();
            $table->string('status')->default('pending_approval'); // active, pending_approval, revoked
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->index('employee_id');
            $table->index(['employee_id', 'status']);
            $table->unique(['employee_id', 'device_fingerprint']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
