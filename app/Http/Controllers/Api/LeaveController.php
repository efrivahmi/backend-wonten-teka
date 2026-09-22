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
use App\Services\ApprovalService;
use Illuminate\Support\Facades\Storage;

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
        $period = now(config('app.business_timezone', 'Asia/Jakarta'));
        $year = $period->year;
        $month = $period->month;
        $balances = LeaveType::active()->get()->map(function (LeaveType $type) use ($employee, $year, $month) {
            $used = LeaveRequest::where('employee_id', $employee->id)
                ->where('leave_type_id', $type->id)->where('status', 'approved')
                ->whereYear('start_date', $year)->whereMonth('start_date', $month)->sum('total_days');
            
            $balance = LeaveBalance::firstOrNew([
                'employee_id' => $employee->id, 'leave_type_id' => $type->id,
                'year' => $year, 'month' => $month,
            ]);
            $balance->entitled_days = $type->quota_per_month;
            $balance->used_days = $used;
            $balance->carried_over_days = 0;
            $balance->remaining_days = max(0, $type->quota_per_month - $used);
            $balance->setRelation('leaveType', $type);
            return $balance;
        });

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
            ->paginate(25);
            
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
            'attachment_url' => 'nullable|string|max:2048',
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf,doc,docx|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $totalDays = $startDate->diffInDays($endDate) + 1; // Simplistic day calculation (doesn't skip weekends/holidays yet)

        if (!$startDate->isSameMonth($endDate)) {
            throw ValidationException::withMessages([
                'end_date' => 'Pengajuan cuti tidak boleh melewati pergantian bulan. Buat pengajuan terpisah untuk setiap bulan.',
            ]);
        }

        $leaveType = LeaveType::active()->findOrFail($request->leave_type_id);

        if ($leaveType->requires_attachment && !$request->filled('attachment_url') && !$request->hasFile('attachment')) {
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

        $approvedDays = LeaveRequest::where('employee_id', $employee->id)
            ->where('leave_type_id', $leaveType->id)->where('status', 'approved')
            ->whereYear('start_date', $startDate->year)
            ->whereMonth('start_date', $startDate->month)->sum('total_days');
        $balance = LeaveBalance::firstOrCreate([
            'employee_id' => $employee->id, 'leave_type_id' => $leaveType->id,
            'year' => $startDate->year, 'month' => $startDate->month,
        ], [
            'entitled_days' => $leaveType->quota_per_month, 'used_days' => $approvedDays,
            'carried_over_days' => 0, 'remaining_days' => max(0, $leaveType->quota_per_month - $approvedDays),
        ]);
        $pendingDays = LeaveRequest::where('employee_id', $employee->id)
            ->where('leave_type_id', $leaveType->id)->where('status', 'pending')
            ->whereYear('start_date', $startDate->year)
            ->whereMonth('start_date', $startDate->month)->sum('total_days');
        $availableDays = max(0, $balance->remaining_days - $pendingDays);

        if ($totalDays > $availableDays) {
            throw ValidationException::withMessages([
                'end_date' => "Kuota cuti yang tersedia hanya {$availableDays} hari (termasuk pengajuan yang masih menunggu).",
            ]);
        }

        $attachmentUrl = $request->attachment_url;
        if ($request->hasFile('attachment')) {
            $attachmentUrl = Storage::url($request->file('attachment')->store('leave-attachments', 'public'));
        }

        $leaveRequest = LeaveRequest::create([
            
            'employee_id' => $employee->id,
            'leave_type_id' => $request->leave_type_id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_days' => $totalDays,
            'reason' => $request->reason,
            'attachment_url' => $attachmentUrl,
            'status' => 'pending',
        ]);

        $approvalService->submitRequest($leaveRequest, $user, 'leave_request');

        return response()->json([
            'message' => 'Pengajuan cuti dikirim dan menunggu persetujuan admin.',
            'data' => $leaveRequest->load('approvalInstance')
        ]);
    }

    public function show(Request $request, $id)
    {
        $employee = $request->user()->employee;
        $leave = \App\Models\LeaveRequest::where('employee_id', $employee->id)->with('leaveType')->findOrFail($id);
        return response()->json($leave);
    }

    public function cancel(Request $request, $id)
    {
        $employee = $request->user()->employee;
        $leave = \App\Models\LeaveRequest::where('employee_id', $employee->id)->findOrFail($id);
        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Hanya pengajuan dengan status pending yang dapat dibatalkan.'], 422);
        }
        $leave->delete();
        return response()->json(['message' => 'Pengajuan berhasil dibatalkan.']);
    }
}
