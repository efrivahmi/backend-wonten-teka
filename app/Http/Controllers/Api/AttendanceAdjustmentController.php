<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceAdjustmentRequest;
use App\Services\ApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AttendanceAdjustmentController extends Controller
{
    /**
     * Get the current employee's adjustment history.
     */
    public function index(Request $request)
    {
        $employee = $request->user()->employee;
        
        $history = AttendanceAdjustmentRequest::where('employee_id', $employee->id)
            ->with(['approvalInstance.actions'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);
            
        return response()->json($history);
    }

    /**
     * Submit a new attendance adjustment request (Lupa Absen).
     */
    public function store(Request $request, ApprovalService $approvalService)
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'check_in' => 'required|date_format:H:i',
            'check_out' => 'required|date_format:H:i',
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $adjustmentRequest = AttendanceAdjustmentRequest::create([
            'company_id' => $user->company_id,
            'employee_id' => $employee->id,
            'date' => Carbon::parse($request->date),
            'check_in' => $request->check_in,
            'check_out' => $request->check_out,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Trigger the multi-level approval engine
        $approvalService->submitRequest($adjustmentRequest, $user, 'attendance_adjustment_request');

        return response()->json([
            'message' => 'Attendance adjustment request submitted successfully.',
            'data' => $adjustmentRequest->load('approvalInstance')
        ]);
    }
}
