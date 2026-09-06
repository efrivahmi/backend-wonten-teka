<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use Illuminate\Http\Request;

class AttendanceAdminController extends Controller
{
    /**
     * Get all attendance logs for admin monitoring.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $logs = AttendanceLog::query()
            ->with(['employee', 'employee.user'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }

    public function flags(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $logs = AttendanceLog::query()
            ->flagged()
            ->with(['employee'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $logs]);
    }

    /**
     * Resolve a flagged attendance log (Approve/Reject).
     */
    public function resolveFlag(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $log = AttendanceLog::where('id', $id)
            
            ->firstOrFail();

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string'
        ]);

        $log->is_flagged = false; // It's no longer flagged, it's resolved.
        
        if ($validated['action'] === 'approve') {
            $log->status = 'approved';
        } else {
            $log->status = 'rejected';
        }

        if (isset($validated['notes'])) {
            $log->admin_notes = $validated['notes'];
        }

        $log->save();

        return response()->json([
            'message' => 'Attendance flag resolved successfully.',
            'data' => $log
        ]);
    }

    /**
     * Update an attendance log manually (Admin override).
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
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
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $log = AttendanceLog::findOrFail($id);
        $log->delete();

        return response()->json([
            'message' => 'Attendance log deleted successfully.'
        ]);
    }
}
