<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Employee;
use App\Models\AttendanceLog;
use App\Models\LeaveRequest;
use App\Models\OvertimeRequest;
use App\Models\Claim;
use App\Models\Setting;
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
        $totalEmployees = Employee::where('is_active', true)->count();

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

        $departments = Employee::query()
            ->where('is_active', true)
            ->whereNotNull('department')
            ->selectRaw('department, COUNT(*) as total_employees')
            ->groupBy('department')
            ->orderBy('department')
            ->get()
            ->map(function ($department) use ($today) {
                $present = AttendanceLog::whereDate('check_in_at', $today)
                    ->whereHas('employee', fn ($query) => $query->where('department', $department->department))
                    ->distinct('employee_id')->count('employee_id');
                $late = AttendanceLog::whereDate('check_in_at', $today)
                    ->where('status', 'late')
                    ->whereHas('employee', fn ($query) => $query->where('department', $department->department))
                    ->distinct('employee_id')->count('employee_id');
                $total = (int) $department->total_employees;

                return [
                    'department' => $department->department,
                    'total' => $total,
                    'present' => $present,
                    'late' => $late,
                    'absent' => max(0, $total - $present),
                    'attendance_rate' => $total > 0 ? round(($present / $total) * 100, 1) : 0,
                ];
            })->values();

        $workingDays = Setting::where('key', 'working_days')->first()?->value ?? [1, 2, 3, 4, 5];
        $monthStart = $today->copy()->startOfMonth();
        $workingDaysElapsed = collect();
        for ($date = $monthStart->copy(); $date->lte($today); $date->addDay()) {
            if (in_array($date->dayOfWeekIso, $workingDays, true)) $workingDaysElapsed->push($date->copy());
        }
        $presentEmployeeDays = AttendanceLog::whereBetween('check_in_at', [$monthStart, $today->copy()->endOfDay()])
            ->selectRaw('DATE(check_in_at) as attendance_date, employee_id')
            ->distinct()->get()->count();
        $expectedEmployeeDays = $totalEmployees * $workingDaysElapsed->count();
        $monthAttendanceRate = $expectedEmployeeDays > 0
            ? round(($presentEmployeeDays / $expectedEmployeeDays) * 100, 1)
            : 0;
        $averageWorkMinutes = (int) round((float) AttendanceLog::whereBetween('check_in_at', [$monthStart, $today->copy()->endOfDay()])
            ->whereNotNull('work_duration_minutes')->avg('work_duration_minutes'));

        $dailyTrend = $workingDaysElapsed->map(function ($date) use ($totalEmployees) {
            $present = AttendanceLog::whereDate('check_in_at', $date)->distinct('employee_id')->count('employee_id');
            return [
                'date' => $date->toDateString(),
                'label' => $date->format('d M'),
                'present' => $present,
                'rate' => $totalEmployees > 0 ? round(($present / $totalEmployees) * 100, 1) : 0,
            ];
        })->values();

        $monthlyTrend = collect(range(5, 0))->map(function ($monthsAgo) use ($today, $workingDays, $totalEmployees) {
            $start = $today->copy()->subMonths($monthsAgo)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $days = 0;
            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                if (in_array($date->dayOfWeekIso, $workingDays, true)) $days++;
            }
            $present = AttendanceLog::whereBetween('check_in_at', [$start, $end])
                ->selectRaw('DATE(check_in_at), employee_id')->distinct()->get()->count();
            $expected = $totalEmployees * $days;
            return ['label' => $start->translatedFormat('M Y'), 'rate' => $expected > 0 ? round(($present / $expected) * 100, 1) : 0];
        })->push([
            'label' => $today->translatedFormat('M Y'),
            'rate' => $monthAttendanceRate,
        ])->values();

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
                'recent_flags' => $flags,
                'department_attendance' => $departments,
                'attendance_month' => [
                    'label' => $today->translatedFormat('F Y'),
                    'rate' => $monthAttendanceRate,
                    'present_employee_days' => $presentEmployeeDays,
                    'expected_employee_days' => $expectedEmployeeDays,
                    'working_days_elapsed' => $workingDaysElapsed->count(),
                    'average_work_minutes' => $averageWorkMinutes,
                ],
                'daily_attendance_trend' => $dailyTrend,
                'monthly_attendance_trend' => $monthlyTrend,
            ]
        ]);
    }
}
