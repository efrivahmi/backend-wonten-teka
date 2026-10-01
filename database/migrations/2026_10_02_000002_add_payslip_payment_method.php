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
            $table->string('payment_method')->nullable()->after('payment_status');
            $table->string('payment_reference', 120)->nullable()->after('payment_method');
            $table->timestamp('paid_at')->nullable()->after('payment_reference');
        });

        // Before method tracking existed, a completed slip was confirmed only
        // through the direct cash handover flow.
        DB::table('payslips')->where('payment_status', 'collected')->update([
            'payment_method' => 'cash',
            'paid_at' => DB::raw('COALESCE(collected_at, payment_available_at)'),
        ]);
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'payment_reference', 'paid_at']);
        });
    }
};
