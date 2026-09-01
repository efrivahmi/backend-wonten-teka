<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessTripRequest;
use App\Services\ApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class BusinessTripController extends Controller
{
    /**
     * Get the current employee's business trip history.
     */
    public function index(Request $request)
    {
        $employee = $request->user()->employee;
        
        $history = BusinessTripRequest::where('employee_id', $employee->id)
            ->with(['approvalInstance.actions'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);
            
        return response()->json($history);
    }

    /**
     * Submit a new business trip request (Dinas Luar).
     */
    public function store(Request $request, ApprovalService $approvalService)
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $businessTripRequest = BusinessTripRequest::create([
            'company_id' => $user->company_id,
            'employee_id' => $employee->id,
            'start_date' => Carbon::parse($request->start_date),
            'end_date' => Carbon::parse($request->end_date),
            'location' => $request->location,
            'description' => $request->description,
            'status' => 'pending',
        ]);

        // Trigger the multi-level approval engine
        $approvalService->submitRequest($businessTripRequest, $user, 'business_trip_request');

        return response()->json([
            'message' => 'Business trip request submitted successfully.',
            'data' => $businessTripRequest->load('approvalInstance')
        ]);
    }
}
