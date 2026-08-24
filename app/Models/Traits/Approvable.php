<?php

namespace App\Models\Traits;

use App\Models\ApprovalInstance;
use Illuminate\Database\Eloquent\Relations\MorphOne;

trait Approvable
{
    /**
     * Get the approval instance for this model.
     */
    public function approvalInstance(): MorphOne
    {
        return $this->morphOne(ApprovalInstance::class, 'approvable');
    }

    /**
     * Check if the model is fully approved.
     */
    public function isApproved(): bool
    {
        return $this->approvalInstance && $this->approvalInstance->overall_status === 'approved';
    }

    /**
     * Check if the model is pending approval.
     */
    public function isPendingApproval(): bool
    {
        return $this->approvalInstance && $this->approvalInstance->overall_status === 'pending';
    }

    /**
     * Check if the model is rejected.
     */
    public function isRejected(): bool
    {
        return $this->approvalInstance && $this->approvalInstance->overall_status === 'rejected';
    }
}
