<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_tasks', function (Blueprint $table) {
            $table->boolean('is_habit')->default(false)->after('task_date');
            $table->boolean('reminder_enabled')->default(false)->after('reminder_time');
            $table->index(['employee_id', 'is_habit']);
        });
    }

    public function down(): void
    {
        Schema::table('personal_tasks', function (Blueprint $table) {
            $table->dropIndex(['employee_id', 'is_habit']);
            $table->dropColumn(['is_habit', 'reminder_enabled']);
        });
    }
};
