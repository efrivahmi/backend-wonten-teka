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
            ->paginate(15);

        return response()->json($pendingDevices);
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
}
