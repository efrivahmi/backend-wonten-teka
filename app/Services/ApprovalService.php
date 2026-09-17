<?php

namespace App\Services;

use App\Models\ApprovalFlow;
use App\Models\ApprovalInstance;
use App\Models\ApprovalAction;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\BusinessTripRequest;
use App\Models\AttendanceAdjustmentRequest;
use App\Models\AttendanceLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ApprovalService
{
    /**
     * Submit a request for approval based on the company's defined flow.
     */
    public function submitRequest(Model $approvable, User $submitter, string $requestType): ?ApprovalInstance
    {
        $flow = ApprovalFlow::query()
            ->where('request_type', $requestType)
            ->where('is_active', true)
            ->first();

        // Requests must never silently approve themselves. Provide a safe
        // one-step admin flow until the company configures a custom flow.
        if (!$flow) {
            $flow = ApprovalFlow::create([
                'request_type' => $requestType,
                'name' => 'Persetujuan Admin - '.str_replace('_', ' ', $requestType),
                'steps' => [[
                    'step' => 1,
                    'approver_type' => 'role',
                    'approver_value' => 'admin',
                ]],
                'is_active' => true,
            ]);
        }

        // Initialize the approval instance
        return DB::transaction(function () use ($approvable, $flow, $submitter) {
            return ApprovalInstance::create([
                
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

                if ($instance->approvable instanceof LeaveRequest) {
                    $leave = $instance->approvable;
                    $balance = LeaveBalance::where('employee_id', $leave->employee_id)
                        ->where('leave_type_id', $leave->leave_type_id)
                        ->where('year', $leave->start_date->year)
                        ->where('month', $leave->start_date->month)
                        ->lockForUpdate()
                        ->first();

                    if ($balance) {
                        if ($balance->remaining_days < $leave->total_days) {
                            throw new \RuntimeException('Sisa cuti karyawan tidak mencukupi.');
                        }
                        $balance->increment('used_days', $leave->total_days);
                        $balance->decrement('remaining_days', $leave->total_days);
                    }

                    // Create attendance logs for leave duration
                    $startDate = Carbon::parse($leave->start_date);
                    $endDate = Carbon::parse($leave->end_date);
                    
                    for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                        $log = AttendanceLog::where('employee_id', $leave->employee_id)
                            ->whereDate('check_in_at', $date->format('Y-m-d'))
                            ->first();
                            
                        if (!$log) {
                            $log = new AttendanceLog();
                            $log->employee_id = $leave->employee_id;
                            $log->check_in_at = $date->copy()->startOfDay();
                        }
                        
                        $log->status = 'cuti';
                        // Do not clear check_in/check_out if they already exist, 
                        // just set status to cuti. If new, they default to null.
                        $log->save();
                    }

                } elseif ($instance->approvable instanceof BusinessTripRequest) {
                    $trip = $instance->approvable;
                    $startDate = Carbon::parse($trip->start_date);
                    $endDate = Carbon::parse($trip->end_date);

                    for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                        $log = AttendanceLog::where('employee_id', $trip->employee_id)
                            ->whereDate('check_in_at', $date->format('Y-m-d'))
                            ->first();
                            
                        if (!$log) {
                            $log = new AttendanceLog();
                            $log->employee_id = $trip->employee_id;
                            $log->check_in_at = $date->copy()->startOfDay();
                        }
                        
                        $log->status = 'dinas';
                        $log->save();
                    }

                } elseif ($instance->approvable instanceof AttendanceAdjustmentRequest) {
                    $adjustment = $instance->approvable;
                    $dateStr = \Carbon\Carbon::parse($adjustment->date)->format('Y-m-d');
                    
                    $log = AttendanceLog::where('employee_id', $adjustment->employee_id)
                        ->whereDate('check_in_at', $dateStr)
                        ->first();
                        
                    if (!$log) {
                        $log = new AttendanceLog();
                        $log->employee_id = $adjustment->employee_id;
                    }
                    
                    if ($adjustment->check_in) {
                        $log->check_in_at = \Carbon\Carbon::parse($dateStr . ' ' . $adjustment->check_in);
                    }
                    if ($adjustment->check_out) {
                        $log->check_out_at = \Carbon\Carbon::parse($dateStr . ' ' . $adjustment->check_out);
                    }
                    
                    // You might want to update status depending on your company logic. 
                    // For now, if we adjust it, we consider it 'present' (or 'late' based on logic).
                    // We'll set it to 'present' if they have both check_in and check_out.
                    $log->status = 'present';
                    $log->save();
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
