<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->string('category')->default('Reguler')->after('name');
        });

        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->dropUnique(['employee_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::table('shift_templates', function (Blueprint $table) {
            $table->dropColumn('category');
        });

        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->unique(['employee_id', 'date']);
        });
    }
};
