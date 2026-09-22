<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            // Kept as `email` for compatibility with released mobile builds,
            // but the value may also be an employee number.
            'email' => 'required|string|max:255',
            'password' => 'required',
            'device_name' => 'required',
        ]);

        $identifier = trim($credentials['email']);
        $user = User::query()
            ->where('email', $identifier)
            ->orWhereHas('employee', function ($query) use ($identifier) {
                $query->where('employee_number', $identifier);
            })
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau kata sandi tidak sesuai.'],
            ]);
        }
        
        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Akun Anda sedang dinonaktifkan. Hubungi admin.'],
            ]);
        }

        $token = $user->createToken($request->device_name)->plainTextToken;

        $user->load('employee', 'roles');
        $user->employee?->append(['nik', 'npwp', 'bpjs_kesehatan_number', 'bpjs_ketenagakerjaan_number', 'bank_account_number']);

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('employee', 'roles', 'permissions');
        $user->employee?->append(['nik', 'npwp', 'bpjs_kesehatan_number', 'bpjs_ketenagakerjaan_number', 'bank_account_number']);
        return response()->json([
            'user' => $user,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
        ]);
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        $user->save();
        return response()->json(['message' => 'Profil berhasil diperbarui.', 'user' => $user->fresh()->load('employee', 'roles')]);
    }
}
