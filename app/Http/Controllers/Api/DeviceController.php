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

        // A physical device may be proposed for more than one account, but each
        // employee/fingerprint pair has its own approval lifecycle.
        $device = Device::firstOrNew([
            'employee_id' => $employee->id,
            'device_fingerprint' => $request->device_fingerprint,
        ]);

        $device->fill([
            'device_name' => $request->device_name,
            'device_model' => $request->device_model,
            'os_version' => $request->os_version,
            'app_version' => $request->app_version,
        ]);

        // Registration is idempotent for active and pending devices. A rejected
        // or revoked device can be submitted again for a fresh admin decision.
        if (!$device->exists || in_array($device->status, ['rejected', 'revoked'], true)) {
            $device->status = 'pending_approval';
            $device->approved_by = null;
            $device->approved_at = null;
        }

        $device->save();

        return response()->json([
            'device' => $device,
            'message' => $device->status === 'active'
                ? 'Perangkat ini sudah disetujui.'
                : 'Pengajuan perangkat tercatat dan menunggu persetujuan admin.',
        ], $device->wasRecentlyCreated ? 201 : 200);
    }

    public function status(Request $request)
    {
        $request->validate([
            'device_fingerprint' => 'required|string',
        ]);

        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User is not linked to an employee.'], 403);
        }

        $device = $employee->devices()
            ->where('device_fingerprint', $request->device_fingerprint)
            ->first();

        if (!$device) {
            return response()->json(['message' => 'Device not found.'], 404);
        }

        return response()->json(['device' => $device]);
    }
}
