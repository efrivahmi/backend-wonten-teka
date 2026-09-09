<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeBiometric;
use Illuminate\Http\Request;

class WebBiometricController extends Controller
{
    public function enroll(Request $request)
    {
        $data = $request->validate([
            'embeddings' => 'required|array|min:3|max:5',
            'embeddings.*' => 'required|array|size:128',
            'embeddings.*.*' => 'required|numeric|between:-10,10',
            'device_id' => 'required|string|max:255',
        ]);
        $employee = $request->user()->employee;
        abort_unless($employee, 403, 'Profil karyawan tidak ditemukan.');

        $biometric = EmployeeBiometric::updateOrCreate(
            ['employee_id' => $employee->id],
            [
                'web_face_embedding' => $data['embeddings'],
                'device_id' => $data['device_id'],
                'enrolled_at' => now(),
            ]
        );

        $employee->update(['face_enrolled' => true, 'face_enrolled_at' => now()]);

        return response()->json([
            'message' => 'Data wajah web berhasil disimpan.',
            'enrolled_at' => $biometric->enrolled_at,
        ], 201);
    }

    public function sync(Request $request)
    {
        $employee = $request->user()->employee;
        abort_unless($employee, 403, 'Profil karyawan tidak ditemukan.');
        $biometric = EmployeeBiometric::where('employee_id', $employee->id)->first();

        abort_unless($biometric, 404, 'Data wajah belum pernah didaftarkan.');

        $embeddings = $biometric->web_face_embedding;
        if (!$embeddings && $this->isWebDescriptorSet($biometric->face_embedding)) {
            $embeddings = $biometric->face_embedding;
            $biometric->update(['web_face_embedding' => $embeddings]);
        }

        abort_unless($embeddings, 404, 'Wajah untuk browser belum didaftarkan. Silakan lakukan pendaftaran wajah web.');

        return response()->json(['embeddings' => $embeddings]);
    }

    private function isWebDescriptorSet(mixed $embeddings): bool
    {
        return is_array($embeddings)
            && count($embeddings) >= 3
            && collect($embeddings)->every(fn ($descriptor) => is_array($descriptor) && count($descriptor) === 128);
    }
}
