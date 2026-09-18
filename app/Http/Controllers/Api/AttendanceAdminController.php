<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\AttendanceSecurityEvent;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AttendanceAdminController extends Controller
{
    /**
     * Get all attendance logs for admin monitoring.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $timezone = config('app.business_timezone', 'Asia/Jakarta');
        [$periodStart, $periodEnd] = $this->resolvePeriod($request, $timezone);

        $logs = AttendanceLog::query()
            ->with(['employee', 'employee.user'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->query('search'));
                $query->whereHas('employee', fn ($employee) => $employee
                    ->where('full_name', 'like', "%{$search}%")
                    ->orWhere('employee_number', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"));
            })
            ->when($request->filled('employee_ids'), function ($query) use ($request) {
                $ids = collect(explode(',', (string) $request->query('employee_ids')))
                    ->filter(fn ($id) => ctype_digit($id))
                    ->map(fn ($id) => (int) $id);
                if ($ids->isNotEmpty()) $query->whereIn('employee_id', $ids);
            })
            ->when($periodStart, fn ($query) => $query->where('check_in_at', '>=', $periodStart))
            ->when($periodEnd, fn ($query) => $query->where('check_in_at', '<=', $periodEnd))
            ->when($request->filled('department'), fn ($query) => $query->whereHas(
                'employee', fn ($employee) => $employee->where('department', $request->string('department'))
            ))
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json($logs);
    }

    /** Resolve user-selected calendar boundaries in the company's timezone. */
    private function resolvePeriod(Request $request, string $timezone): array
    {
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $start = $request->filled('date_from')
                ? Carbon::createFromFormat('Y-m-d', (string) $request->string('date_from'), $timezone)->startOfDay()->utc()
                : null;
            $end = $request->filled('date_to')
                ? Carbon::createFromFormat('Y-m-d', (string) $request->string('date_to'), $timezone)->endOfDay()->utc()
                : null;

            return [$start, $end];
        }

        if ($request->filled('month') || $request->filled('year')) {
            $month = min(12, max(1, (int) $request->query('month', now($timezone)->month)));
            $year = min(2100, max(2000, (int) $request->query('year', now($timezone)->year)));
            $localMonth = Carbon::create($year, $month, 1, 0, 0, 0, $timezone);

            return [
                $localMonth->copy()->startOfMonth()->utc(),
                $localMonth->copy()->endOfMonth()->endOfDay()->utc(),
            ];
        }

        return [null, null];
    }

    /**
     * Show one attendance record with all information needed by admin.
     */
    public function show(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $log = AttendanceLog::with([
            'employee:id,full_name,employee_number,department,position,email,phone',
            'device:id,employee_id,device_name,device_model,os_version,app_version,status,last_used_at',
            'shiftAssignment.shiftTemplate:id,name,category,start_time,end_time',
        ])->findOrFail($id);

        return response()->json(['data' => $log]);
    }

    public function securityEvents(Request $request)
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $logs = AttendanceSecurityEvent::query()
            ->with([
                'employee:id,full_name,employee_number,department,position,email,phone',
                'device:id,employee_id,device_fingerprint,device_name,device_model,os_version,app_version,status,last_used_at',
            ])
            ->latest('detected_at')
            ->paginate(min(500, max(1, (int) $request->query('per_page', 50))));

        return response()->json($logs);
    }

    /**
     * Update an attendance log manually (Admin override).
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $log = AttendanceLog::findOrFail($id);

        $validated = $request->validate([
            'check_in_at' => 'nullable|date',
            'check_out_at' => 'nullable|date',
            'status' => 'nullable|string'
        ]);

        if (array_key_exists('check_in_at', $validated)) {
            $log->check_in_at = $validated['check_in_at'];
        }
        if (array_key_exists('check_out_at', $validated)) {
            $log->check_out_at = $validated['check_out_at'];
        }
        if (isset($validated['status'])) {
            $log->status = $validated['status'];
        }

        $log->save();

        return response()->json([
            'message' => 'Attendance log updated successfully.',
            'data' => $log
        ]);
    }

    /**
     * Delete an attendance log (Admin override).
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $log = AttendanceLog::findOrFail($id);
        $log->delete();

        return response()->json([
            'message' => 'Attendance log deleted successfully.'
        ]);
    }
}
