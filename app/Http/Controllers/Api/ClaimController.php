<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\ClaimCategory;
use App\Services\ApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ClaimController extends Controller
{
    /**
     * Get available claim categories for the company.
     */
    public function categories(Request $request)
    {
        $user = $request->user();
        
        $categories = ClaimCategory::query()
            ->active()
            ->get();
            
        return response()->json($categories);
    }

    /**
     * Get the employee's claim history.
     */
    public function history(Request $request)
    {
        $employee = $request->user()->employee;
        
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $claims = Claim::where('employee_id', $employee->id)
            ->with(['claimCategory', 'approvalInstance.actions'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);
            
        return response()->json($claims);
    }

    /**
     * Submit a new claim.
     */
    public function submit(Request $request, ApprovalService $approvalService)
    {
        $user = $request->user();
        $employee = $user->employee;
        
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'claim_category_id' => 'required|exists:claim_categories,id',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'description' => 'required|string|max:1000',
            'receipt' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify category belongs to the same company
        $category = ClaimCategory::where('id', $request->claim_category_id)
            
            ->first();
            
        if (!$category) {
            return response()->json(['message' => 'Invalid claim category.'], 400);
        }
        
        if ($category->requires_receipt && !$request->hasFile('receipt')) {
            return response()->json(['errors' => ['receipt' => ['Receipt is required for this category.']]], 422);
        }

        $receiptUrl = null;
        if ($request->hasFile('receipt')) {
            $path = $request->file('receipt')->store('receipts', 'public');
            $receiptUrl = $path;
        }

        $claim = Claim::create([
            
            'employee_id' => $employee->id,
            'claim_category_id' => $category->id,
            'amount' => $request->amount,
            'expense_date' => $request->expense_date,
            'description' => $request->description,
            'receipt_url' => $receiptUrl,
            'status' => 'pending',
        ]);

        // Submit to approval engine
        $approvalService->submitRequest($claim, $user, 'claim');

        return response()->json([
            'message' => 'Claim submitted successfully.',
            'data' => $claim->load('claimCategory')
        ], 201);
    }
}
