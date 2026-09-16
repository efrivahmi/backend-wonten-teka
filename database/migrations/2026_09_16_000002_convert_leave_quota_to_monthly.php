<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('leave_types', 'quota_per_month')) {
            Schema::table('leave_types', function (Blueprint $table) {
                $table->unsignedInteger('quota_per_month')->default(0)->after('quota_per_year');
            });
            DB::table('leave_types')->update(['quota_per_month' => DB::raw('quota_per_year')]);
        }

        if (!Schema::hasColumn('leave_balances', 'month')) {
            Schema::table('leave_balances', function (Blueprint $table) {
                $table->unsignedTinyInteger('month')->default(1)->after('year');
            });
        }

        // MySQL may use the old unique index to support a foreign key. Provide
        // an equivalent non-unique index before replacing it with the monthly
        // unique constraint.
        if (!Schema::hasIndex('leave_balances', 'leave_balances_employee_type_year_index')) {
            Schema::table('leave_balances', function (Blueprint $table) {
                $table->index(
                    ['employee_id', 'leave_type_id', 'year'],
                    'leave_balances_employee_type_year_index'
                );
            });
        }

        if (Schema::hasIndex('leave_balances', 'leave_balances_employee_id_leave_type_id_year_unique')) {
            Schema::table('leave_balances', function (Blueprint $table) {
                $table->dropUnique('leave_balances_employee_id_leave_type_id_year_unique');
            });
        }

        if (!Schema::hasIndex('leave_balances', 'leave_balances_employee_type_period_unique')) {
            Schema::table('leave_balances', function (Blueprint $table) {
                $table->unique(
                    ['employee_id', 'leave_type_id', 'year', 'month'],
                    'leave_balances_employee_type_period_unique'
                );
            });
        }
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
