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
        $pendingDevices = Device::with(['employee:id,first_name,last_name,email'])
            
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
            // Changed business logic: Allow multiple devices per employee
            // Admin approval simply activates this specific device without deactivating others.
            $device->update(['status' => 'active']);
            $message = 'Device approved successfully.';
        } else {
            $device->update(['status' => 'rejected']);
            $message = 'Device rejected.';
        }

        return response()->json(['message' => $message, 'device' => $device]);
    }
}
