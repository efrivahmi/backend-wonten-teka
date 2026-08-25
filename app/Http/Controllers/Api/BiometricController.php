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
            'embeddings' => 'required|array|min:1',
            'device_id' => 'required|string',
        ]);

        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User is not linked to an employee.'], 403);
        }

        // Encode the array of embeddings (from 3 poses) into JSON string
        $embeddingsJson = json_encode($request->embeddings);

        // Update or create biometric record
        $biometric = EmployeeBiometric::updateOrCreate(
            ['employee_id' => $employee->id],
            [
                'company_id' => $employee->company_id,
                'face_embedding' => $embeddingsJson,
                'device_id' => $request->device_id,
                'enrolled_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Face data enrolled successfully.',
            'biometric' => $biometric
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
            'embeddings' => json_decode($biometric->face_embedding, true),
        ]);
    }
}
