<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Personal info
            $table->string('full_name');
            $table->string('employee_number')->nullable();
            $table->text('nik_encrypted')->nullable(); // National ID - encrypted
            $table->text('npwp_encrypted')->nullable(); // Tax ID - encrypted
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable(); // male, female
            $table->text('address')->nullable();
            $table->string('photo_url')->nullable();

            // Employment info
            $table->string('department')->nullable();
            $table->string('position')->nullable();
            $table->date('join_date')->nullable();
            $table->string('employment_status')->default('permanent'); // permanent, contract, probation
            $table->boolean('is_active')->default(true);

            // Tax & BPJS
            $table->string('ptkp_status')->default('TK/0'); // TK/0, K/0, K/1, K/2, K/3
            $table->text('bpjs_kesehatan_number_encrypted')->nullable();
            $table->text('bpjs_ketenagakerjaan_number_encrypted')->nullable();

            // Bank info
            $table->string('bank_name')->nullable();
            $table->text('bank_account_number_encrypted')->nullable();
            $table->string('bank_account_holder')->nullable();

            // Face recognition
            $table->text('face_embedding_encrypted')->nullable();
            $table->boolean('face_enrolled')->default(false);
            $table->timestamp('face_enrolled_at')->nullable();

            $table->timestamps();
            $table->softDeletes();
            $table->index('user_id');
            $table->index(['employee_number']);
            $table->index(['department']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
