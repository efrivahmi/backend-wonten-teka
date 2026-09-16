<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\AttendanceSecurityEvent;
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
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('check_in_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('check_in_at', '<=', $request->date('date_to')))
            ->when($request->filled('month'), fn ($query) => $query->whereMonth('check_in_at', (int) $request->query('month')))
            ->when($request->filled('year'), fn ($query) => $query->whereYear('check_in_at', (int) $request->query('year')))
            ->when($request->filled('department'), fn ($query) => $query->whereHas(
                'employee', fn ($employee) => $employee->where('department', $request->string('department'))
            ))
            ->orderBy('created_at', 'desc')
            ->paginate(min(500, max(1, (int) $request->query('per_page', 50))));

        return response()->json($logs);
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
