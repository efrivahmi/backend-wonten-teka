<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalInstance;
use App\Services\ApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ApprovalController extends Controller
{
    /**
     * Get pending approvals for the current user.
     * Note: In a real system, you'd filter by checking if the user's role/id matches
     * the requirement for the `current_step` in the `ApprovalFlow`.
     * For this MVP, we return all pending instances in the company.
     */
    public function pending(Request $request)
    {
        $user = $request->user();
        
        $pending = ApprovalInstance::with('approvable')
            ->where('company_id', $user->company_id)
            ->pending()
            ->paginate(15);
            
        return response()->json($pending);
    }

    /**
     * Approve or reject a request.
     */
    public function action(Request $request, ApprovalInstance $instance, ApprovalService $approvalService)
    {
        $user = $request->user();

        // Security check
        if ($instance->company_id !== $user->company_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'decision' => 'required|in:approve,reject',
            'comment' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            if ($request->decision === 'approve') {
                $approvalService->approve($instance, $user, $request->comment);
                $message = 'Request approved successfully.';
            } else {
                $approvalService->reject($instance, $user, $request->comment);
                $message = 'Request rejected successfully.';
            }

            return response()->json([
                'message' => $message,
                'data' => $instance->fresh()
            ]);
            
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
