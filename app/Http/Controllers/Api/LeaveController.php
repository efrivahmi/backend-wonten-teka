<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Services\ApprovalService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LeaveController extends Controller
{
    /**
     * Get all available leave types for the company.
     */
    public function types(Request $request)
    {
        $types = LeaveType::where('company_id', $request->user()->company_id)
            ->where('is_active', true)
            ->get();
            
        return response()->json($types);
    }

    /**
     * Get the current employee's leave balances.
     */
    public function balances(Request $request)
    {
        $employee = $request->user()->employee;
        
        $balances = $employee->leaveBalances()->with('leaveType')->get();
        
        return response()->json($balances);
    }

    /**
     * Get the current employee's leave history.
     */
    public function history(Request $request)
    {
        $employee = $request->user()->employee;
        
        $history = LeaveRequest::where('employee_id', $employee->id)
            ->with(['leaveType', 'approvalInstance.actions'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);
            
        return response()->json($history);
    }

    /**
     * Submit a new leave request.
     */
    public function request(Request $request, ApprovalService $approvalService)
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:255',
            'attachment_url' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $totalDays = $startDate->diffInDays($endDate) + 1; // Simplistic day calculation (doesn't skip weekends/holidays yet)

        // TODO: Validate against leave balance if required by leave type

        $leaveRequest = LeaveRequest::create([
            'company_id' => $user->company_id,
            'employee_id' => $employee->id,
            'leave_type_id' => $request->leave_type_id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_days' => $totalDays,
            'reason' => $request->reason,
            'attachment_url' => $request->attachment_url,
            'status' => 'pending',
        ]);

        // Trigger the multi-level approval engine
        $approvalService->submitRequest($leaveRequest, $user, 'leave_request');

        return response()->json([
            'message' => 'Leave request submitted successfully.',
            'data' => $leaveRequest->load('approvalInstance')
        ]);
    }
}
