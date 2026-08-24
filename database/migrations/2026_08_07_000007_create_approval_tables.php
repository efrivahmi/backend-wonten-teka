<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Generic approval flow definitions
        Schema::create('approval_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('request_type'); // leave_request, claim, overtime
            $table->string('name');
            $table->json('steps'); // [{step: 1, approver_type: "role"|"specific", approver_value: "supervisor"|user_id, conditions: {...}}]
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('company_id');
            $table->index(['company_id', 'request_type']);
        });

        // Approval instances — one per actual request
        Schema::create('approval_instances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('approval_flow_id')->constrained()->cascadeOnDelete();
            $table->morphs('approvable'); // approvable_type + approvable_id (polymorphic)
            $table->integer('current_step')->default(1);
            $table->string('overall_status')->default('pending'); // pending, approved, rejected, cancelled
            $table->timestamps();

            $table->index('company_id');
            $table->index('overall_status');
        });

        // Approval actions — audit trail per step
        Schema::create('approval_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_instance_id')->constrained()->cascadeOnDelete();
            $table->integer('step_number');
            $table->foreignId('actor_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision'); // approved, rejected
            $table->text('comment')->nullable();
            $table->timestamp('acted_at');
            $table->timestamps();

            $table->index('approval_instance_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_actions');
        Schema::dropIfExists('approval_instances');
        Schema::dropIfExists('approval_flows');
    }
};
