<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\ShiftAssignment;
use App\Models\ShiftTemplate;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ShiftAssignmentController extends Controller
{
    /**
     * Get a grid of shift assignments for the week.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $startDateStr = $request->query('start_date', Carbon::now()->startOfWeek()->format('Y-m-d'));
        $endDateStr = $request->query('end_date', Carbon::now()->endOfWeek()->format('Y-m-d'));

        $startDate = Carbon::parse($startDateStr);
        $endDate = Carbon::parse($endDateStr);

        // Fetch active employees
        $employees = Employee::where('company_id', $user->company_id)->where('status', 'active')->get();

        // Fetch assignments for the period
        $assignments = ShiftAssignment::where('company_id', $user->company_id)
            ->whereBetween('date', [$startDateStr, $endDateStr])
            ->with('shiftTemplate')
            ->get();

        // Fetch available templates
        $templates = ShiftTemplate::where('company_id', $user->company_id)->active()->get();

        return response()->json([
            'start_date' => $startDateStr,
            'end_date' => $endDateStr,
            'employees' => $employees,
            'assignments' => $assignments,
            'templates' => $templates,
        ]);
    }

    /**
     * Store or update a shift assignment for an employee on a specific date.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'shift_template_id' => 'required|exists:shift_templates,id',
            'notes' => 'nullable|string',
        ]);

        $assignment = ShiftAssignment::updateOrCreate(
            [
                'company_id' => $user->company_id,
                'employee_id' => $validated['employee_id'],
                'date' => $validated['date'],
            ],
            [
                'shift_template_id' => $validated['shift_template_id'],
                'notes' => $validated['notes'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Shift assigned successfully.',
            'data' => $assignment->load('shiftTemplate')
        ], 200);
    }
}
