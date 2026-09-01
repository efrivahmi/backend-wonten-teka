<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OvertimeRequest;
use App\Services\ApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class OvertimeController extends Controller
{
    /**
     * Get the current employee's overtime history.
     */
    public function index(Request $request)
    {
        $employee = $request->user()->employee;
        
        $history = OvertimeRequest::where('employee_id', $employee->id)
            ->with(['approvalInstance.actions'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);
            
        return response()->json($history);
    }

    /**
     * Submit a new overtime request.
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
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'overtime_type' => 'required|string|in:Hari Kerja,Hari Libur',
            'reason' => 'required|string|max:255',
            'attachment_url' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $overtimeRequest = OvertimeRequest::create([
            'company_id' => $user->company_id,
            'employee_id' => $employee->id,
            'date' => Carbon::parse($request->date),
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'overtime_type' => $request->overtime_type,
            'reason' => $request->reason,
            'attachment_url' => $request->attachment_url,
            'status' => 'pending',
        ]);

        // Trigger the multi-level approval engine
        $approvalService->submitRequest($overtimeRequest, $user, 'overtime_request');

        return response()->json([
            'message' => 'Overtime request submitted successfully.',
            'data' => $overtimeRequest->load('approvalInstance')
        ]);
    }
}
