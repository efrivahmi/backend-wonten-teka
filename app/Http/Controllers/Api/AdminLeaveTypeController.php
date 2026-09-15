<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminLeaveTypeController extends Controller
{
    /**
     * Get all leave types for the company (admin view including inactive).
     */
    public function index(Request $request)
    {
        $types = LeaveType::all();
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
            'code' => 'nullable|string|max:30',
            'quota_per_year' => 'required|integer|min:0|max:366',
            'is_paid' => 'boolean',
            'is_active' => 'boolean',
            'requires_attachment' => 'boolean',
            'is_carry_over_allowed' => 'boolean',
            'max_carry_over_days' => 'nullable|integer|min:0|max:366',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $type = LeaveType::create($validator->validated());

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
        $type = LeaveType::find($id);

        if (!$type) {
            return response()->json(['message' => 'Leave type not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'code' => 'nullable|string|max:30',
            'quota_per_year' => 'sometimes|integer|min:0|max:366',
            'is_paid' => 'boolean',
            'is_active' => 'boolean',
            'requires_attachment' => 'boolean',
            'is_carry_over_allowed' => 'boolean',
            'max_carry_over_days' => 'nullable|integer|min:0|max:366',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $type->update($validator->validated());
        if (array_key_exists('quota_per_year', $validator->validated())) {
            LeaveBalance::where('leave_type_id', $type->id)
                ->where('year', now()->year)
                ->get()
                ->each(function (LeaveBalance $balance) use ($type) {
                    $balance->update([
                        'entitled_days' => $type->quota_per_year,
                        'remaining_days' => max(0, $type->quota_per_year + $balance->carried_over_days - $balance->used_days),
                    ]);
                });
        }

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
        $type = LeaveType::find($id);

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
