<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // PPh 21 TER category rates (Tarif Efektif Rata-rata)
        Schema::create('pph21_ter_rates', function (Blueprint $table) {
            $table->id();
            $table->string('category'); // A, B, C
            $table->decimal('income_range_start', 15, 2);
            $table->decimal('income_range_end', 15, 2)->nullable(); // null = unlimited
            $table->decimal('effective_rate', 8, 6); // e.g., 0.005000 = 0.5%
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->index(['category', 'effective_from']);
        });

        // PPh 21 progressive brackets (for December reconciliation)
        Schema::create('pph21_progressive_brackets', function (Blueprint $table) {
            $table->id();
            $table->decimal('bracket_start', 15, 2);
            $table->decimal('bracket_end', 15, 2)->nullable(); // null = unlimited
            $table->decimal('rate', 8, 6); // e.g., 0.050000 = 5%
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->index('effective_from');
        });

        // PTKP thresholds (Non-Taxable Income)
        Schema::create('ptkp_thresholds', function (Blueprint $table) {
            $table->id();
            $table->string('status'); // TK/0, K/0, K/1, K/2, K/3
            $table->decimal('annual_threshold', 15, 2);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->index(['status', 'effective_from']);
        });

        // BPJS & Tapera rates
        Schema::create('bpjs_rates', function (Blueprint $table) {
            $table->id();
            $table->string('program'); // kesehatan, jht, jp, jkk, jkm, jkp, tapera
            $table->decimal('employer_rate', 8, 6); // percentage as decimal
            $table->decimal('employee_rate', 8, 6);
            $table->decimal('salary_cap', 15, 2)->nullable(); // null = no cap
            $table->string('jkk_risk_class')->nullable(); // Only for JKK: I, II, III, IV, V
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['program', 'effective_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bpjs_rates');
        Schema::dropIfExists('ptkp_thresholds');
        Schema::dropIfExists('pph21_progressive_brackets');
        Schema::dropIfExists('pph21_ter_rates');
    }
};
