<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_biometrics', function (Blueprint $table) {
            $table->text('web_face_embedding')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('employee_biometrics', function (Blueprint $table) {
            $table->dropColumn('web_face_embedding');
        });
    }
};
