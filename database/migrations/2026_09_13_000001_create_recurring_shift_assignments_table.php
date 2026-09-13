<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_shift_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shift_template_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // ISO: Monday=1, Sunday=7
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['employee_id', 'shift_template_id', 'day_of_week'], 'recurring_shift_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_shift_assignments');
    }
};
