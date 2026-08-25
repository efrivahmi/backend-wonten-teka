<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use Illuminate\Http\Request;

class AttendanceAdminController extends Controller
{
    /**
     * Get all flagged attendance logs.
     */
    public function flags(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $logs = AttendanceLog::where('company_id', $user->company_id)
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
        if (!$user->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $log = AttendanceLog::where('id', $id)
            ->where('company_id', $user->company_id)
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
}
