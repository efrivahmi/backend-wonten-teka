<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClaimCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ClaimCategoryController extends Controller
{
    /**
     * Get all claim categories (for admin).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $categories = ClaimCategory::orderBy('name')->paginate(25);
        return response()->json($categories);
    }

    /**
     * Create a new claim category.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'monthly_limit' => 'nullable|numeric|min:0',
            'requires_receipt' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category = ClaimCategory::create([
            'name' => $request->name,
            'monthly_limit' => $request->monthly_limit,
            'requires_receipt' => $request->requires_receipt ?? true,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json(['message' => 'Jenis Klaim berhasil ditambahkan.', 'data' => $category], 201);
    }

    /**
     * Update an existing claim category.
     */
    public function update(Request $request, ClaimCategory $category)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'monthly_limit' => 'nullable|numeric|min:0',
            'requires_receipt' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category->update([
            'name' => $request->name,
            'monthly_limit' => $request->monthly_limit,
            'requires_receipt' => $request->requires_receipt ?? $category->requires_receipt,
            'is_active' => $request->is_active ?? $category->is_active,
        ]);

        return response()->json(['message' => 'Jenis Klaim berhasil diperbarui.', 'data' => $category]);
    }

    /**
     * Delete a claim category.
     */
    public function destroy(Request $request, ClaimCategory $category)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($category->claims()->exists()) {
            return response()->json([
                'message' => 'Tidak dapat menghapus jenis klaim ini karena sudah digunakan oleh pengajuan klaim karyawan.'
            ], 400);
        }

        $category->delete();

        return response()->json(['message' => 'Jenis Klaim berhasil dihapus.']);
    }
}
