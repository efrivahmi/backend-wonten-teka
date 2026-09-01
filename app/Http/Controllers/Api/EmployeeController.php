<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        $employees = Employee::query()
            ->with('user:id,email')
            ->orderBy('full_name', 'asc')
            ->get();
            
        return response()->json([
            'data' => $employees
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')
            ],
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:20',
            'employee_number' => 'required|string|max:50',
            'department' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:100',
            'role' => 'nullable|string'
        ]);

        try {
            DB::beginTransaction();

            $newUser = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                
                'is_active' => true,
            ]);

            if (!empty($validated['role'])) {
                try {
                    $newUser->assignRole($validated['role']);
                } catch (\Exception $e) {
                    // Ignore if role doesn't exist
                }
            }

            $employee = Employee::create([
                
                'user_id' => $newUser->id,
                'full_name' => $validated['name'],
                'employee_number' => $validated['employee_number'],
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'department' => $validated['department'],
                'position' => $validated['position'],
                'is_active' => true,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Employee created successfully',
                'data' => $employee
            ], 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create employee: ' . $e->getMessage()
            ], 500);
        }
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
            'employee_number' => 'sometimes|required|string|max:50',
            'department' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            if (isset($validated['name'])) $employee->full_name = $validated['name'];
            if (isset($validated['employee_number'])) $employee->employee_number = $validated['employee_number'];
            if (array_key_exists('phone', $validated)) $employee->phone = $validated['phone'];
            if (array_key_exists('email', $validated)) $employee->email = $validated['email'];
            if (array_key_exists('department', $validated)) $employee->department = $validated['department'];
            if (array_key_exists('position', $validated)) $employee->position = $validated['position'];
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
                    $appUser->save();
                    $appUser->delete();
                }
            }

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
