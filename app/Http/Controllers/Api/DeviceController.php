<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'device_fingerprint' => 'required|string',
            'device_name' => 'required|string',
            'device_model' => 'nullable|string',
            'os_version' => 'nullable|string',
            'app_version' => 'nullable|string',
        ]);

        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User is not linked to an employee.'], 403);
        }

        // Check if employee already has an active device
        $activeDevice = $employee->devices()->active()->first();

        // If they are registering the same device, just return it
        if ($activeDevice && $activeDevice->device_fingerprint === $request->device_fingerprint) {
            return response()->json(['device' => $activeDevice, 'message' => 'Device already registered and active.']);
        }

        // Auto-approve if this is the employee's first device ever
        $hasAnyDevice = $employee->devices()->exists();
        $status = $hasAnyDevice ? 'pending_approval' : 'active';

        // Create new device
        $device = Device::create([
            'employee_id' => $employee->id,
            'company_id' => $employee->company_id,
            'device_fingerprint' => $request->device_fingerprint,
            'device_name' => $request->device_name,
            'device_model' => $request->device_model,
            'os_version' => $request->os_version,
            'app_version' => $request->app_version,
            'status' => $status,
        ]);

        return response()->json([
            'device' => $device,
            'message' => 'Device registration requested. Waiting for admin approval.',
        ], 201);
    }

    public function status(Request $request)
    {
        $request->validate([
            'device_fingerprint' => 'required|string',
        ]);

        $device = $request->user()->employee->devices()
            ->where('device_fingerprint', $request->device_fingerprint)
            ->first();

        if (!$device) {
            return response()->json(['message' => 'Device not found.'], 404);
        }

        return response()->json(['device' => $device]);
    }
}
