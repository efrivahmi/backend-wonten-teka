<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminLeaveTypeController extends Controller
{
    /**
     * Get all leave types for the company (admin view including inactive).
     */
    public function index(Request $request)
    {
        $types = LeaveType::where('company_id', $request->user()->company_id)->get();
        return response()->json([
            'status' => 'success',
            'data' => $types
        ]);
    }

    /**
     * Store a newly created leave type.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'days_allowed' => 'required|integer|min:0',
            'is_paid' => 'boolean',
            'is_active' => 'boolean',
            'requires_approval' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $type = LeaveType::create(array_merge($request->all(), [
            'company_id' => $request->user()->company_id
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Leave type created successfully.',
            'data' => $type
        ], 201);
    }

    /**
     * Update the specified leave type.
     */
    public function update(Request $request, $id)
    {
        $type = LeaveType::where('company_id', $request->user()->company_id)
            ->where('id', $id)
            ->first();

        if (!$type) {
            return response()->json(['message' => 'Leave type not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'days_allowed' => 'sometimes|integer|min:0',
            'is_paid' => 'boolean',
            'is_active' => 'boolean',
            'requires_approval' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $type->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Leave type updated successfully.',
            'data' => $type
        ]);
    }

    /**
     * Remove the specified leave type.
     */
    public function destroy(Request $request, $id)
    {
        $type = LeaveType::where('company_id', $request->user()->company_id)
            ->where('id', $id)
            ->first();

        if (!$type) {
            return response()->json(['message' => 'Leave type not found.'], 404);
        }

        // Only allow deleting if not used in any leave requests (optional, but good practice)
        if ($type->leaveRequests()->exists()) {
            // Soft delete or deactivate instead? Let's deactivate
            $type->update(['is_active' => false]);
            return response()->json([
                'status' => 'success',
                'message' => 'Leave type is in use and has been deactivated instead of deleted.',
            ]);
        }

        $type->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Leave type deleted successfully.'
        ]);
    }
}
