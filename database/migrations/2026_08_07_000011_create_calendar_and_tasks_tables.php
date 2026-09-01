<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Company calendar events
        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type')->default('holiday'); // holiday, meeting, event
            $table->string('scope')->default('company'); // company, department
            $table->string('department')->nullable(); // if scope=department
            $table->date('start_date');
            $table->date('end_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_rule')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('company_id');
            $table->index(['start_date', 'end_date']);
            $table->index(['type']);
        });

        // Personal tasks / habit tracker
        Schema::create('personal_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('recurrence_rule')->nullable(); // daily, weekly, specific days
            $table->time('reminder_time')->nullable();
            $table->integer('streak_count')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->timestamp('last_completed_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('employee_id');
        });

        // Personal task completions
        Schema::create('personal_task_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personal_task_id')->constrained()->cascadeOnDelete();
            $table->date('completed_date');
            $table->timestamps();

            $table->unique(['personal_task_id', 'completed_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_task_completions');
        Schema::dropIfExists('personal_tasks');
        Schema::dropIfExists('calendar_events');
    }
};
