<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\ShiftAssignment;
use App\Models\ShiftTemplate;
use App\Models\RecurringShiftAssignment;
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
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $startDateStr = $request->query('start_date', Carbon::now()->startOfWeek()->format('Y-m-d'));
        $endDateStr = $request->query('end_date', Carbon::now()->endOfWeek()->format('Y-m-d'));

        $startDate = Carbon::parse($startDateStr);
        $endDate = Carbon::parse($endDateStr);

        // Fetch active employees
        $employees = Employee::where('is_active', true)
            ->orderBy('department')
            ->orderBy('full_name')
            ->get();

        // Fetch assignments for the period
        $assignments = ShiftAssignment::query()
            ->whereBetween('date', [$startDateStr, $endDateStr])
            ->with('shiftTemplate')
            ->get();

        // Fetch available templates
        $templates = ShiftTemplate::active()->get();
        $recurringAssignments = RecurringShiftAssignment::with(['shiftTemplate', 'employee'])
            ->orderBy('day_of_week')
            ->get();

        return response()->json([
            'start_date' => $startDateStr,
            'end_date' => $endDateStr,
            'employees' => $employees,
            'assignments' => $assignments,
            'templates' => $templates,
            'recurring_assignments' => $recurringAssignments,
        ]);
    }

    /**
     * Store or update shift assignments for an employee on a specific date.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($request->filled('recurring_day_of_week')) {
            $validated = $request->validate([
                'employee_ids' => 'required|array|min:1',
                'employee_ids.*' => 'integer|exists:employees,id',
                'shift_template_id' => 'required|exists:shift_templates,id',
                'recurring_day_of_week' => 'required|integer|min:1|max:7',
                'starts_on' => 'nullable|date',
                'ends_on' => 'nullable|date|after_or_equal:starts_on',
                'notes' => 'nullable|string|max:500',
            ]);

            $assignments = collect($validated['employee_ids'])->map(fn ($employeeId) =>
                RecurringShiftAssignment::updateOrCreate([
                    'employee_id' => $employeeId,
                    'shift_template_id' => $validated['shift_template_id'],
                    'day_of_week' => $validated['recurring_day_of_week'],
                ], [
                    'starts_on' => $validated['starts_on'] ?? null,
                    'ends_on' => $validated['ends_on'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                ])
            );

            return response()->json([
                'message' => 'Jadwal shift mingguan berhasil ditugaskan.',
                'data' => $assignments,
            ]);
        }

        if ($request->filled('shift_template_id') && !$request->has('shift_template_ids')) {
            $request->merge(['shift_template_ids' => [$request->input('shift_template_id')]]);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'shift_template_ids' => 'required|array',
            'shift_template_ids.*' => 'exists:shift_templates,id',
            'notes' => 'nullable|string',
        ]);

        // Delete existing assignments for this employee on this date
        ShiftAssignment::where('employee_id', $validated['employee_id'])
            ->where('date', $validated['date'])
            ->delete();

        $assignments = [];
        foreach ($validated['shift_template_ids'] as $templateId) {
            $assignments[] = ShiftAssignment::create([
                'employee_id' => $validated['employee_id'],
                'date' => $validated['date'],
                'shift_template_id' => $templateId,
                'notes' => $validated['notes'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'Shifts assigned successfully.',
            'data' => $assignments
        ], 200);
    }
}
