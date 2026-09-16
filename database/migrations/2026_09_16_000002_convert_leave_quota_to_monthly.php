<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_types', function (Blueprint $table) {
            $table->unsignedInteger('quota_per_month')->default(0)->after('quota_per_year');
        });
        DB::table('leave_types')->update(['quota_per_month' => DB::raw('quota_per_year')]);

        Schema::table('leave_balances', function (Blueprint $table) {
            $table->unsignedTinyInteger('month')->default(1)->after('year');
            $table->dropUnique(['employee_id', 'leave_type_id', 'year']);
            $table->unique(['employee_id', 'leave_type_id', 'year', 'month'], 'leave_balances_employee_type_period_unique');
        });
    }

    public function down(): void
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->dropUnique('leave_balances_employee_type_period_unique');
            $table->dropColumn('month');
            $table->unique(['employee_id', 'leave_type_id', 'year']);
        });
        Schema::table('leave_types', fn (Blueprint $table) => $table->dropColumn('quota_per_month'));
    }
};
