<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class EmployeeController extends Controller
{
    public function directory(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $employees = Employee::query()
            ->where('is_active', true)
            ->when($search !== '', fn ($query) => $query->where(function ($nested) use ($search) {
                $nested->where('full_name', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%");
            }))
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'department', 'position', 'phone', 'photo_url']);

        return response()->json(['data' => $employees]);
    }

    public function updateOwnProfile(Request $request)
    {
        $employee = $request->user()->employee;
        abort_unless($employee, 403, 'Profil karyawan tidak ditemukan.');

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($request->user()->id)],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($employee, $validated, $request) {
            $employee->update([
                'full_name' => $validated['full_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
            ]);
            $request->user()->update(['name' => $validated['full_name'], 'email' => $validated['email']]);
        });

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user' => $request->user()->fresh()->load('employee', 'roles'),
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $search = $request->query('search');
        
        $employees = Employee::query()
            ->with(['user:id,email', 'user.roles:id,name'])
            ->when($search, function ($query, $search) {
                $query->where('full_name', 'like', "%{$search}%")
                    ->orWhere('employee_number', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('email', 'like', "%{$search}%");
                    });
            })
            ->orderBy('full_name', 'asc')
            ->paginate(25);
            
        return response()->json($employees);
    }

    public function getOptions(Request $request)
    {
        $configured = Setting::where('key', 'app_config')->first()?->value['dropdowns'] ?? [];
        $departments = Employee::whereNotNull('department')->where('department', '!=', '')->distinct()->pluck('department')
            ->merge(['Pimpinan', 'Tata Usaha', 'Kurikulum', 'Kesiswaan', 'Sarana Prasarana', 'Keuangan', 'SDM', 'Humas', 'Pengasuhan', 'Keamanan', 'Teknologi Informasi'])
            ->merge($configured['departments'] ?? [])
            ->unique()->sort()->values();
        $positions = Employee::whereNotNull('position')->where('position', '!=', '')->distinct()->pluck('position')
            ->merge(['Kepala Lembaga', 'Kepala Sekolah', 'Wakil Kepala Sekolah', 'Kepala Tata Usaha', 'Guru', 'Wali Kelas', 'Pembina', 'Pelatih', 'Staf Administrasi', 'Staf Keuangan', 'Staf IT', 'Petugas Keamanan'])
            ->merge($configured['positions'] ?? [])
            ->unique()->sort()->values();
        
        return response()->json([
            'departments' => $departments,
            'positions' => $positions,
            'genders' => [
                ['value' => 'male', 'label' => 'Laki-laki'],
                ['value' => 'female', 'label' => 'Perempuan'],
            ],
            'employment_statuses' => [
                ['value' => 'permanent', 'label' => 'Pegawai Tetap'],
                ['value' => 'contract', 'label' => 'Pegawai Kontrak'],
                ['value' => 'probation', 'label' => 'Masa Percobaan'],
                ['value' => 'intern', 'label' => 'Magang'],
                ['value' => 'honorary', 'label' => 'Honorer'],
            ],
            'ptkp_statuses' => collect(['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3', 'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3'])
                ->map(fn ($value) => ['value' => $value, 'label' => $value])->values(),
            'banks' => collect(['BCA', 'Mandiri', 'BNI', 'BRI', 'BSI', 'CIMB Niaga', 'Permata', 'Danamon', 'Bank Jabar Banten', 'BTN', 'Mega'])
                ->merge($configured['banks'] ?? [])->unique()->values(),
        ]);
    }

    public function completeProfile(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'nik' => 'nullable|string|max:50',
            'npwp' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:20',
            'email' => 'required|string|email|max:255',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string|in:male,female',
            'address' => 'nullable|string',
            'department' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:100',
            'join_date' => 'nullable|date',
            'employment_status' => 'required|string',
            'ptkp_status' => 'nullable|string',
            'bpjs_kesehatan_number' => 'nullable|string',
            'bpjs_ketenagakerjaan_number' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'bank_account_number' => 'nullable|string',
            'bank_account_holder' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $employee = $user->employee ?? new Employee();
            $employee->user_id = $user->id;
            $employee->full_name = $validated['full_name'];
            // Nomor karyawan ditetapkan saat akun dibuat oleh admin dan tidak
            // boleh diminta atau diganti kembali pada onboarding mandiri.
            if (!$employee->employee_number || preg_match('/^\d{19,}$/', $employee->employee_number)) {
                $employee->employee_number = $this->generateEmployeeNumber(
                    $user->id,
                    $user->hasRole('admin') ? 'admin' : 'employee'
                );
            }
            $employee->phone = $validated['phone'] ?? null;
            $employee->email = $validated['email'];
            $employee->date_of_birth = $validated['date_of_birth'] ?? null;
            $employee->gender = $validated['gender'] ?? null;
            $employee->address = $validated['address'] ?? null;
            $employee->department = $validated['department'] ?? null;
            $employee->position = $validated['position'] ?? null;
            $employee->join_date = $validated['join_date'] ?? null;
            $employee->employment_status = $validated['employment_status'];
            $employee->ptkp_status = $validated['ptkp_status'] ?? $employee->ptkp_status ?? 'TK/0';
            $employee->is_active = true;
            $employee->face_enrolled = false;

            if (!empty($validated['nik'])) {
                $employee->nik_encrypted = \Illuminate\Support\Facades\Crypt::encryptString($validated['nik']);
            }
            if (!empty($validated['npwp'])) {
                $employee->npwp_encrypted = \Illuminate\Support\Facades\Crypt::encryptString($validated['npwp']);
            }
            if (!empty($validated['bpjs_kesehatan_number'])) {
                $employee->bpjs_kesehatan_number_encrypted = \Illuminate\Support\Facades\Crypt::encryptString($validated['bpjs_kesehatan_number']);
            }
            if (!empty($validated['bpjs_ketenagakerjaan_number'])) {
                $employee->bpjs_ketenagakerjaan_number_encrypted = \Illuminate\Support\Facades\Crypt::encryptString($validated['bpjs_ketenagakerjaan_number']);
            }
            if (!empty($validated['bank_name'])) {
                $employee->bank_name = $validated['bank_name'];
            }
            if (!empty($validated['bank_account_number'])) {
                $employee->bank_account_number_encrypted = \Illuminate\Support\Facades\Crypt::encryptString($validated['bank_account_number']);
            }
            if (!empty($validated['bank_account_holder'])) {
                $employee->bank_account_holder = $validated['bank_account_holder'];
            }

            $employee->save();

            // The account is initially named from the email only as a
            // placeholder. Once onboarding is completed, the employee's full
            // name becomes the canonical display name everywhere.
            $user->update([
                'name' => $validated['full_name'],
                'email' => $validated['email'],
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Profile completed successfully',
                'data' => $employee,
                'user' => $user->fresh()->load('employee', 'roles'),
            ], 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to complete profile: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => 'required|string|min:6',
            'role' => ['nullable', 'string', Rule::in(['employee', 'admin'])],
        ]);

        try {
            DB::beginTransaction();

            $emailOwner = User::withTrashed()->where('email', $validated['email'])->lockForUpdate()->first();
            if ($emailOwner && !$emailOwner->trashed()) {
                throw ValidationException::withMessages(['email' => 'Email sudah digunakan oleh akun yang masih aktif.']);
            }
            if ($emailOwner) {
                $archivedEmail = sprintf('deleted+%d+%s@archive.invalid', $emailOwner->id, now()->format('YmdHis'));
                Employee::withTrashed()->where('user_id', $emailOwner->id)->update(['email' => $archivedEmail]);
                $emailOwner->email = $archivedEmail;
                $emailOwner->save();
            }

            $initialName = collect(preg_split('/[._-]+/', strstr($validated['email'], '@', true)))
                ->filter()
                ->map(fn ($part) => ucfirst(strtolower($part)))
                ->join(' ');
            $initialName = $initialName ?: 'Karyawan Baru';

            $newUser = User::create([
                'name' => $initialName,
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                
                'is_active' => true,
            ]);

            $role = $validated['role'] ?? 'employee';
            $newUser->assignRole(Role::findOrCreate($role, 'web'));

            $employee = Employee::create([
                
                'user_id' => $newUser->id,
                'full_name' => $initialName,
                'employee_number' => $this->generateEmployeeNumber($newUser->id, $role),
                'phone' => null,
                'email' => $validated['email'],
                'department' => null,
                'position' => $role === 'admin' ? 'Administrator' : null,
                'gender' => null,
                'address' => null,
                'join_date' => null,
                'is_active' => true,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Employee created successfully',
                'data' => $employee
            ], 201);
            
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create employee: ' . $e->getMessage()
            ], 500);
        }
    }

    private function generateEmployeeNumber(int $userId, string $role = 'employee'): string
    {
        $prefix = $role === 'admin' ? 'ADM' : 'EMP';
        $base = $prefix . '-' . now()->format('Y') . '-' . str_pad((string) $userId, 4, '0', STR_PAD_LEFT);
        $candidate = $base;
        $suffix = 1;

        while (Employee::withTrashed()->where('employee_number', $candidate)->exists()) {
            $candidate = $base . '-' . $suffix++;
        }

        return $candidate;
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $employee = Employee::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                $employee->user_id ? Rule::unique('users', 'email')->ignore($employee->user_id) : '',
            ],
            'phone' => 'nullable|string|max:20',
            'employee_number' => [
                'nullable', 'string', 'max:50',
                'not_regex:/^\d{19,}$/',
                Rule::unique('employees', 'employee_number')->ignore($employee->id),
            ],
            'department' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:100',
            'gender' => 'nullable|in:male,female',
            'address' => 'nullable|string|max:1000',
            'join_date' => 'nullable|date',
            'employment_status' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'role' => ['sometimes', 'required', 'string', Rule::in(['employee', 'admin'])],
            'password' => 'nullable|string|min:6',
        ]);

        try {
            DB::beginTransaction();

            if (isset($validated['name'])) $employee->full_name = $validated['name'];
            if (isset($validated['employee_number'])) $employee->employee_number = $validated['employee_number'];
            if (array_key_exists('phone', $validated)) $employee->phone = $validated['phone'];
            if (array_key_exists('email', $validated)) $employee->email = $validated['email'];
            if (array_key_exists('department', $validated)) $employee->department = $validated['department'];
            if (array_key_exists('position', $validated)) {
                $employee->position = $validated['position'];
            }
            if ($request->filled('role') && empty($employee->position)) {
                $employee->position = $request->role === 'admin' ? 'Administrator' : null;
            }
            if (array_key_exists('gender', $validated)) $employee->gender = $validated['gender'];
            if (array_key_exists('address', $validated)) $employee->address = $validated['address'];
            if (array_key_exists('join_date', $validated)) $employee->join_date = $validated['join_date'];
            if (array_key_exists('employment_status', $validated)) $employee->employment_status = $validated['employment_status'];
            if (isset($validated['is_active'])) $employee->is_active = $validated['is_active'];

            $employee->save();

            if ($employee->user_id) {
                $appUser = User::find($employee->user_id);
                if ($appUser) {
                    if (isset($validated['name'])) $appUser->name = $validated['name'];
                    if (array_key_exists('email', $validated)) $appUser->email = $validated['email'];
                    if (isset($validated['is_active'])) $appUser->is_active = $validated['is_active'];
                    
                    if ($request->filled('password')) {
                        $appUser->password = Hash::make($request->password);
                    }
                    
                    $appUser->save();
                    
                    if ($request->filled('role')) {
                        try {
                            $appUser->syncRoles([$request->role]);
                        } catch (\Exception $e) {}
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Employee updated successfully',
                'data' => $employee
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update employee: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $employee = Employee::findOrFail($id);

        try {
            DB::beginTransaction();

            $employee->is_active = false;
            $employee->save();
            $employee->delete();

            if ($employee->user_id) {
                $appUser = User::find($employee->user_id);
                if ($appUser) {
                    $appUser->is_active = false;
                    $appUser->email = sprintf('deleted+%d+%s@archive.invalid', $appUser->id, now()->format('YmdHis'));
                    $appUser->save();
                    $appUser->delete();
                }
            }

            $employee->email = sprintf('deleted-employee+%d+%s@archive.invalid', $employee->id, now()->format('YmdHis'));
            $employee->save();

            DB::commit();

            return response()->json([
                'message' => 'Employee deactivated successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to deactivate employee: ' . $e->getMessage()
            ], 500);
        }
    }
}
