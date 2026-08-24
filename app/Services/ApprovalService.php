<?php

namespace App\Services;

use App\Models\ApprovalFlow;
use App\Models\ApprovalInstance;
use App\Models\ApprovalAction;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ApprovalService
{
    /**
     * Submit a request for approval based on the company's defined flow.
     */
    public function submitRequest(Model $approvable, User $submitter, string $requestType): ?ApprovalInstance
    {
        $flow = ApprovalFlow::where('company_id', $submitter->company_id)
            ->where('request_type', $requestType)
            ->where('is_active', true)
            ->first();

        // If no flow is defined, we could either auto-approve or throw an exception.
        // Auto-approve is a common fallback if a company doesn't configure approvals for a module.
        if (!$flow) {
            $approvable->update(['status' => 'approved']); // Requires the model to have a 'status' field
            return null;
        }

        // Initialize the approval instance
        return DB::transaction(function () use ($approvable, $flow, $submitter) {
            return ApprovalInstance::create([
                'company_id' => $submitter->company_id,
                'approval_flow_id' => $flow->id,
                'approvable_type' => get_class($approvable),
                'approvable_id' => $approvable->id,
                'current_step' => 1,
                'overall_status' => 'pending',
            ]);
        });
    }

    /**
     * Approve the current step of an instance.
     */
    public function approve(ApprovalInstance $instance, User $approver, ?string $comment = null): bool
    {
        if ($instance->overall_status !== 'pending') {
            throw new \Exception("Approval instance is already finalized.");
        }

        return DB::transaction(function () use ($instance, $approver, $comment) {
            // Record the action
            ApprovalAction::create([
                'approval_instance_id' => $instance->id,
                'step_number' => $instance->current_step,
                'actor_id' => $approver->id,
                'decision' => 'approved',
                'comment' => $comment,
                'acted_at' => now(),
            ]);

            $flow = $instance->approvalFlow;
            $steps = collect($flow->steps); // Assumes JSON cast array

            // Check if there are more steps
            $nextStep = $instance->current_step + 1;
            $hasNextStep = $steps->contains('step', $nextStep);

            if ($hasNextStep) {
                // Advance to next step
                $instance->update(['current_step' => $nextStep]);
            } else {
                // Finalize approval
                $instance->update(['overall_status' => 'approved']);
                
                // Update the original model's status if it has one
                if (method_exists($instance->approvable, 'update')) {
                    $instance->approvable->update(['status' => 'approved']);
                }
            }

            return true;
        });
    }

    /**
     * Reject the current step, which rejects the entire request.
     */
    public function reject(ApprovalInstance $instance, User $rejector, string $comment): bool
    {
        if ($instance->overall_status !== 'pending') {
            throw new \Exception("Approval instance is already finalized.");
        }

        return DB::transaction(function () use ($instance, $rejector, $comment) {
            ApprovalAction::create([
                'approval_instance_id' => $instance->id,
                'step_number' => $instance->current_step,
                'actor_id' => $rejector->id,
                'decision' => 'rejected',
                'comment' => $comment,
                'acted_at' => now(),
            ]);

            $instance->update(['overall_status' => 'rejected']);
            
            if (method_exists($instance->approvable, 'update')) {
                $instance->approvable->update(['status' => 'rejected']);
            }

            return true;
        });
    }
}
