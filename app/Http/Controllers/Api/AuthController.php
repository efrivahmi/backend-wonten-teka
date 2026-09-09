<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

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
                'email' => ['Email/NIP atau kata sandi tidak sesuai.'],
            ]);
        }
        
        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Akun Anda sedang dinonaktifkan. Hubungi admin.'],
            ]);
        }

        $token = $user->createToken($request->device_name)->plainTextToken;

        return response()->json([
            'user' => $user->load('employee', 'roles'),
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
        return response()->json([
            'user' => $request->user()->load('employee', 'roles', 'permissions'),
        ]);
    }
}
