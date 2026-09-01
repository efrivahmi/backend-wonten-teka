<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Claim categories
        Schema::create('claim_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // Transport, Medical, Meals, etc.
            $table->decimal('monthly_limit', 15, 2)->nullable();
            $table->boolean('requires_receipt')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('company_id');
        });

        // Claims
        Schema::create('claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('claim_category_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->string('receipt_url')->nullable();
            $table->text('description')->nullable();
            $table->date('expense_date');
            $table->string('status')->default('pending'); // pending, approved, rejected, paid
            $table->text('rejection_reason')->nullable();
            $table->foreignId('payroll_run_id')->nullable(); // linked to payroll once approved
            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
            $table->index(['employee_id', 'status']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claims');
        Schema::dropIfExists('claim_categories');
    }
};
