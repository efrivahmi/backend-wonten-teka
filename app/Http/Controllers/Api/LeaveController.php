<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class LeaveController extends Controller
{
    /**
     * Get all available leave types for the company.
     */
    public function types(Request $request)
    {
        $types = LeaveType::where('is_active', true)
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
    public function request(Request $request)
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

        $leaveType = LeaveType::active()->findOrFail($request->leave_type_id);

        if ($leaveType->requires_attachment && !$request->filled('attachment_url')) {
            throw ValidationException::withMessages([
                'attachment_url' => 'Jenis cuti ini memerlukan lampiran.',
            ]);
        }

        $overlaps = LeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('start_date', '<=', $endDate)
            ->whereDate('end_date', '>=', $startDate)
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'start_date' => 'Rentang tanggal bertabrakan dengan pengajuan lain.',
            ]);
        }

        $balance = LeaveBalance::where('employee_id', $employee->id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $startDate->year)
            ->first();

        if ($balance && $totalDays > $balance->remaining_days) {
            throw ValidationException::withMessages([
                'end_date' => "Sisa cuti hanya {$balance->remaining_days} hari.",
            ]);
        }

        $leaveRequest = LeaveRequest::create([
            
            'employee_id' => $employee->id,
            'leave_type_id' => $request->leave_type_id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_days' => $totalDays,
            'reason' => $request->reason,
            'attachment_url' => $request->attachment_url,
            'status' => 'approved',
        ]);

        if ($balance) {
            $balance->increment('used_days', $totalDays);
            $balance->decrement('remaining_days', $totalDays);
        }

        return response()->json([
            'message' => 'Leave request recorded successfully.',
            'data' => $leaveRequest
        ]);
    }
}
