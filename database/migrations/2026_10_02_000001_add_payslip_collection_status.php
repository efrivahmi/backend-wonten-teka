<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->string('payment_status')->default('pending')->after('pdf_url')->index();
            $table->timestamp('payment_available_at')->nullable()->after('payment_status');
            $table->timestamp('collected_at')->nullable()->after('payment_available_at');
            $table->foreignId('collected_by')->nullable()->after('collected_at')->constrained('users')->nullOnDelete();
        });

        DB::table('payroll_runs')->where('status', 'finalized')->orderBy('id')->chunkById(100, function ($runs) {
            foreach ($runs as $run) {
                DB::table('payslips')->where('payroll_run_id', $run->id)->update([
                    'payment_status' => 'available',
                    'payment_available_at' => $run->finalized_at,
                ]);
            }
        });

        DB::table('payroll_runs')->where('status', 'paid')->orderBy('id')->chunkById(100, function ($runs) {
            foreach ($runs as $run) {
                DB::table('payslips')->where('payroll_run_id', $run->id)->update([
                    'payment_status' => 'collected',
                    'payment_available_at' => $run->finalized_at,
                    'collected_at' => $run->paid_at,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropForeign(['collected_by']);
            $table->dropIndex(['payment_status']);
            $table->dropColumn(['payment_status', 'payment_available_at', 'collected_at', 'collected_by']);
        });
    }
};
