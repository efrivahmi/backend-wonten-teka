<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('basic_salary', 15, 2)->default(0)->after('employment_status');
        });

        Schema::table('payroll_runs', function (Blueprint $table) {
            $table->date('period_start')->nullable()->after('period_year');
            $table->date('period_end')->nullable()->after('period_start');
            $table->date('scheduled_payment_date')->nullable()->after('period_end');
            $table->json('configuration_snapshot')->nullable()->after('notes');
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->unsignedInteger('attendance_absence_days')->default(0)->after('basic_salary');
            $table->decimal('attendance_deduction_amount', 15, 2)->default(0)->after('attendance_absence_days');
            $table->decimal('bpjs_jkp_employer', 15, 2)->default(0)->after('bpjs_jkm_employer');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn(['attendance_absence_days', 'attendance_deduction_amount', 'bpjs_jkp_employer']);
        });

        Schema::table('payroll_runs', function (Blueprint $table) {
            $table->dropColumn(['period_start', 'period_end', 'scheduled_payment_date', 'configuration_snapshot']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('basic_salary');
        });
    }
};
