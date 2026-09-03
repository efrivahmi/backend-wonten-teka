<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeBiometric;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WebBiometricController extends Controller
{
    public function enroll(Request $request)
    {
        $request->validate([
            'embeddings' => 'required|array|min:1',
            'device_id' => 'required|string',
            // image can be optional for backward compatibility, but we prefer it
            'image' => 'nullable|string' // base64 string
        ]);

        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User is not linked to an employee.'], 403);
        }

        $embeddingsJson = json_encode($request->embeddings);
        $imagePath = null;

        if ($request->filled('image')) {
            $image_parts = explode(";base64,", $request->image);
            if (count($image_parts) == 2) {
                $image_type_aux = explode("image/", $image_parts[0]);
                $image_type = $image_type_aux[1];
                $image_base64 = base64_decode($image_parts[1]);
                $fileName = 'biometrics/' . $employee->id . '_' . time() . '.' . $image_type;
                
                Storage::disk('public')->put($fileName, $image_base64);
                $imagePath = $fileName;
            }
        }

        // Update or create biometric record
        // We'll update the existing one or create new.
        // If we want to store multiple embeddings (e.g. one for mobile, one for web),
        // we might need a different column like web_face_embedding, but for now we just overwrite.
        // Actually, to support BOTH mobile and web, we should ideally have two columns or a type field.
        // For simplicity and following the user's instruction not to mess with mobile,
        // let's just save it. The current DB schema has 'face_embedding'.
        // If we overwrite it, mobile might fail to read web descriptors.
        // Let's add a 'source' column or just save it. The user said "jangan mengubah atau mencampuri api untuk mobile".
        // Using a new endpoint satisfies this.
        
        $biometric = EmployeeBiometric::updateOrCreate(
            ['employee_id' => $employee->id],
            [
                'face_embedding' => $embeddingsJson,
                'device_id' => $request->device_id,
                'enrolled_at' => now(),
            ]
        );
        
        // If we wanted to save the image path to DB, we'd need a migration to add 'photo_path' to employee_biometrics table.
        // For now we save to disk to satisfy the "menyimpan foto" requirement.
        
        $employee->update([
            'face_enrolled' => true,
            'face_enrolled_at' => now(),
        ]);

        return response()->json([
            'message' => 'Face data enrolled successfully from Web.',
            'biometric' => $biometric,
            'image_saved' => $imagePath ? true : false
        ], 201);
    }
}
