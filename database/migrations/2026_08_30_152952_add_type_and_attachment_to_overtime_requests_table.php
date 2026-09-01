<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('overtime_requests', function (Blueprint $table) {
            $table->string('overtime_type')->default('Hari Kerja')->after('end_time');
            $table->string('attachment_url')->nullable()->after('reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('overtime_requests', function (Blueprint $table) {
            $table->dropColumn(['overtime_type', 'attachment_url']);
        });
    }
};
