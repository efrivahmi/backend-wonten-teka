<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\Request;

class DeviceAdminController extends Controller
{
    /**
     * Get a list of pending devices that need approval.
     */
    public function getPendingDevices(Request $request)
    {
        $user = $request->user();
        
        // Ensure user has admin privileges
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        // Fetch pending devices for the admin's company
        $pendingDevices = Device::with(['employee:id,full_name,email,department'])
            
            ->where('status', 'pending_approval')
            ->orderBy('created_at', 'desc')
            ->paginate(min(500, max(1, (int) $request->query('per_page', 15))));

        return response()->json($pendingDevices);
    }

    /**
     * Get all devices that currently have access to the application.
     */
    public function getActiveDevices(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $activeDevices = Device::with(['employee:id,full_name,email,department'])
            ->where('status', 'active')
            ->orderByDesc('last_used_at')
            ->orderByDesc('approved_at')
            ->paginate(min(500, max(1, (int) $request->query('per_page', 30))));

        return response()->json($activeDevices);
    }

    /**
     * Approve or reject a device binding request.
     */
    public function reviewDevice(Request $request, $deviceId)
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $request->validate([
            'action' => 'required|in:approve,reject'
        ]);

        $device = Device::find($deviceId);

        if (!$device) {
            return response()->json(['message' => 'Device not found.'], 404);
        }

        if ($request->action === 'approve') {
            // Other approved devices remain active. Approval applies only to this
            // employee/device association.
            $device->update([
                'status' => 'active',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);
            $message = 'Device approved successfully.';
        } else {
            $device->update([
                'status' => 'rejected',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);
            $message = 'Device rejected.';
        }

        return response()->json(['message' => $message, 'device' => $device]);
    }

    /**
     * Revoke an active device so it can no longer submit attendance.
     */
    public function revokeDevice(Request $request, $deviceId)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $device = Device::where('status', 'active')->find($deviceId);

        if (!$device) {
            return response()->json(['message' => 'Active device not found.'], 404);
        }

        $device->update(['status' => 'revoked']);

        return response()->json([
            'message' => 'Device access revoked successfully.',
            'device' => $device->fresh('employee:id,full_name,email,department'),
        ]);
    }
}
