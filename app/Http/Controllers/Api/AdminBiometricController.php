<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeBiometric;
use Illuminate\Http\Request;

class AdminBiometricController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $employees = Employee::query()
            ->with('user:id,email')
            ->with('biometric:id,employee_id,device_id,enrolled_at,face_embedding,web_face_embedding')
            ->when($search !== '', fn ($query) => $query->where(function ($nested) use ($search) {
                $nested->where('full_name', 'like', "%{$search}%")
                    ->orWhere('employee_number', 'like', "%{$search}%");
            }))
            ->orderBy('full_name')->paginate(20);

        $employees->getCollection()->transform(function ($employee) {
            $mobile = $employee->biometric?->face_embedding;
            $web = $employee->biometric?->web_face_embedding;
            return [
                'id' => $employee->id,
                'full_name' => $employee->full_name,
                'employee_number' => $employee->employee_number,
                'department' => $employee->department,
                'email' => $employee->user?->email ?? $employee->email,
                'face_enrolled' => (bool) $employee->face_enrolled,
                'mobile_pose_count' => is_array($mobile) ? count($mobile) : 0,
                'web_pose_count' => is_array($web) ? count($web) : 0,
                'device_id' => $employee->biometric?->device_id,
                'enrolled_at' => $employee->biometric?->enrolled_at,
            ];
        });

        return response()->json($employees);
    }

    public function reset(Request $request, Employee $employee)
    {
        EmployeeBiometric::where('employee_id', $employee->id)->delete();
        $employee->update(['face_enrolled' => false, 'face_enrolled_at' => null]);

        return response()->json(['message' => 'Data wajah direset. Karyawan dapat melakukan pendaftaran ulang.']);
    }
}
