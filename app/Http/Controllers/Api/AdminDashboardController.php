<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Employee;
use App\Models\AttendanceLog;
use App\Models\LeaveRequest;
use App\Models\OvertimeRequest;
use App\Models\Claim;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    public function getStats(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $today = Carbon::today();

        // 1. Total Employees
        $totalEmployees = Employee::count();

        // 2. Attendance Stats for Today
        $presentCount = AttendanceLog::whereDate('check_in_at', $today)
            ->distinct('employee_id')
            ->count('employee_id');
            
        $lateCount = AttendanceLog::whereDate('check_in_at', $today)
            ->where('status', 'late')
            ->distinct('employee_id')
            ->count('employee_id');

        $onLeaveCount = LeaveRequest::where('status', 'approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->count();
            
        // Assuming the rest are absent if they don't have check-in and are not on leave.
        $absentCount = max(0, $totalEmployees - $presentCount - $onLeaveCount);

        // 3. Pending Approvals
        $pendingLeaves = LeaveRequest::where('status', 'pending')->count();
        $pendingOvertimes = OvertimeRequest::where('status', 'pending')->count();
        $pendingClaims = Claim::where('status', 'pending')->count();
        
        $totalPending = $pendingLeaves + $pendingOvertimes + $pendingClaims;

        // 4. Recent Employees
        $recentEmployees = Employee::with('user')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // 5. Recent Anomalies/Flags
        $flags = AttendanceLog::with('employee')
            ->flagged()
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'employees' => [
                    'total' => $totalEmployees,
                    'recent' => $recentEmployees,
                ],
                'attendance_today' => [
                    'present' => $presentCount,
                    'late' => $lateCount, // Late is a subset of present
                    'on_leave' => $onLeaveCount,
                    'absent' => $absentCount
                ],
                'pending_approvals' => [
                    'total' => $totalPending,
                    'leaves' => $pendingLeaves,
                    'overtimes' => $pendingOvertimes,
                    'claims' => $pendingClaims
                ],
                'recent_flags' => $flags
            ]
        ]);
    }
}
