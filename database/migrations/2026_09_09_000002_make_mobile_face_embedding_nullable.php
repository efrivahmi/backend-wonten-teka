<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_biometrics', function (Blueprint $table) {
            $table->text('face_embedding')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Existing web-only records may contain null, so reverting would be unsafe.
    }
};
