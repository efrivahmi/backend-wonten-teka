<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Payroll components — salary structure definitions
        Schema::create('payroll_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // Basic Salary, Transport Allowance, etc.
            $table->string('code')->nullable();
            $table->string('type'); // earning, deduction
            $table->boolean('is_taxable')->default(true);
            $table->decimal('default_amount', 15, 2)->default(0);
            $table->string('applies_to')->default('all'); // all, specific
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('company_id');
        });

        // Payroll runs — monthly batch processing
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->integer('period_month'); // 1-12
            $table->integer('period_year');
            $table->string('status')->default('draft'); // draft, processing, finalized, paid
            $table->foreignId('run_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->unique(['period_month', 'period_year']);
        });

        // Payslips — one per employee per payroll run
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            // Summary figures
            $table->decimal('basic_salary', 15, 2)->default(0);
            $table->decimal('total_earnings', 15, 2)->default(0);
            $table->decimal('total_deductions', 15, 2)->default(0);
            $table->decimal('gross_salary', 15, 2)->default(0);
            $table->decimal('net_salary', 15, 2)->default(0);

            // Tax & BPJS breakdown
            $table->decimal('pph21_amount', 15, 2)->default(0);
            $table->decimal('bpjs_kesehatan_employee', 15, 2)->default(0);
            $table->decimal('bpjs_kesehatan_employer', 15, 2)->default(0);
            $table->decimal('bpjs_jht_employee', 15, 2)->default(0);
            $table->decimal('bpjs_jht_employer', 15, 2)->default(0);
            $table->decimal('bpjs_jp_employee', 15, 2)->default(0);
            $table->decimal('bpjs_jp_employer', 15, 2)->default(0);
            $table->decimal('bpjs_jkk_employer', 15, 2)->default(0);
            $table->decimal('bpjs_jkm_employer', 15, 2)->default(0);
            $table->decimal('tapera_employee', 15, 2)->default(0);
            $table->decimal('tapera_employer', 15, 2)->default(0);

            // Detailed breakdown
            $table->json('components_detail')->nullable(); // [{name, type, amount, is_taxable}]
            $table->string('pdf_url')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->unique(['payroll_run_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslips');
        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('payroll_components');
    }
};
