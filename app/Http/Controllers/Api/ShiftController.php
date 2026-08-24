<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShiftAssignment;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    /**
     * Get upcoming shift assignments for the employee.
     */
    public function upcoming(Request $request)
    {
        $employee = $request->user()->employee;

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }
        
        $shifts = ShiftAssignment::where('employee_id', $employee->id)
            ->with('shiftTemplate')
            ->whereDate('date', '>=', today())
            ->orderBy('date', 'asc')
            ->paginate(15);
            
        return response()->json($shifts);
    }
}
