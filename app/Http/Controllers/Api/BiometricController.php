<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeBiometric;
use Illuminate\Http\Request;

class BiometricController extends Controller
{
    public function enroll(Request $request)
    {
        $request->validate([
            'embeddings' => 'required|array|min:3|max:5',
            'embeddings.*' => 'required|array|min:4',
            'embeddings.*.*' => 'required|numeric',
            'device_id' => 'required|string|max:255',
        ]);

        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User is not linked to an employee.'], 403);
        }

        // Update or create biometric record
        $biometric = EmployeeBiometric::updateOrCreate(
            ['employee_id' => $employee->id],
            [
                
                'face_embedding' => $request->embeddings,
                'device_id' => $request->device_id,
                'enrolled_at' => now(),
            ]
        );

        // Mark employee as face enrolled
        $employee->update([
            'face_enrolled' => true,
            'face_enrolled_at' => now(),
        ]);

        return response()->json([
            'message' => 'Face data enrolled successfully.',
            'enrolled_at' => $biometric->enrolled_at,
        ], 201);
    }

    public function sync(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User is not linked to an employee.'], 403);
        }

        $biometric = EmployeeBiometric::where('employee_id', $employee->id)->first();

        if (!$biometric) {
            return response()->json([
                'message' => 'No face data found for this employee.',
                'embeddings' => null
            ], 404);
        }

        return response()->json([
            'message' => 'Face data retrieved successfully.',
            'embeddings' => $biometric->face_embedding,
        ]);
    }
}
