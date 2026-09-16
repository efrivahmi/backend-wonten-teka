<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PersonalTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class EmployeeTaskController extends Controller
{
    /**
     * Get tasks for a specific date or today.
     */
    public function index(Request $request)
    {
        $employee = $request->user()->employee;
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $date = $request->query('date', Carbon::today()->toDateString());
        $isHabit = $request->query('type') === 'habit';

        // Get tasks for the specific date, OR tasks without a specific date (recurring habits)
        $tasks = PersonalTask::where('employee_id', $employee->id)
            ->where('is_habit', $isHabit)
            ->when(!$isHabit, function ($query) use ($date) {
                $query->where(function ($dateQuery) use ($date) {
                    $dateQuery->whereDate('task_date', $date)
                        ->orWhereNull('task_date');
                });
            })
            ->orderBy('reminder_time', 'asc')
            ->get();

        return response()->json(['data' => $tasks]);
    }

    /**
     * Get monthly tracking for completed tasks and habits
     */
    public function tracking(Request $request)
    {
        $employee = $request->user()->employee;
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $month = $request->query('month', Carbon::today()->month);
        $year = $request->query('year', Carbon::today()->year);

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $completedTasks = PersonalTask::where('employee_id', $employee->id)
            ->where('is_habit', false)
            ->where('is_active', false)
            ->whereBetween('last_completed_at', [$startDate, $endDate])
            ->orderBy('last_completed_at', 'desc')
            ->get();

        $completedHabits = \App\Models\PersonalTaskCompletion::with('personalTask')
            ->whereHas('personalTask', function ($q) use ($employee) {
                $q->where('employee_id', $employee->id);
            })
            ->whereBetween('completed_date', [$startDate, $endDate])
            ->orderBy('completed_date', 'desc')
            ->get();

        return response()->json([
            'completed_tasks' => $completedTasks,
            'completed_habits' => $completedHabits,
        ]);
    }

    /**
     * Create a new task.
     */
    public function store(Request $request)
    {
        $employee = $request->user()->employee;
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'task_date' => 'nullable|date|required_unless:is_habit,true',
            'is_habit' => 'nullable|boolean',
            'recurrence_rule' => 'nullable|in:daily,weekdays,weekly',
            'reminder_time' => 'nullable|date_format:H:i',
            'reminder_enabled' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $task = PersonalTask::create([
            'employee_id' => $employee->id,
            'title' => $request->title,
            'description' => $request->description,
            'task_date' => $request->task_date,
            'is_habit' => $request->boolean('is_habit'),
            'recurrence_rule' => $request->input('recurrence_rule'),
            'reminder_time' => $request->reminder_time,
            'reminder_enabled' => $request->boolean('reminder_enabled') && $request->filled('reminder_time'),
            'is_active' => true,
        ]);

        return response()->json(['message' => 'Tugas berhasil ditambahkan.', 'data' => $task], 201);
    }

    /**
     * Mark task as complete / incomplete
     */
    public function update(Request $request, $id)
    {
        $employee = $request->user()->employee;
        
        $task = PersonalTask::where('id', $id)
            ->where('employee_id', $employee->id)
            ->firstOrFail();

        $validated = $request->validate([
            'is_active' => 'nullable|boolean',
            'reminder_time' => 'nullable|date_format:H:i',
            'reminder_enabled' => 'nullable|boolean',
        ]);

        if (array_key_exists('is_active', $validated)) {
            $task->is_active = $validated['is_active'];
        }
        if (array_key_exists('reminder_time', $validated)) {
            $task->reminder_time = $validated['reminder_time'];
        }
        if (array_key_exists('reminder_enabled', $validated)) {
            $task->reminder_enabled = $validated['reminder_enabled'] && filled($task->reminder_time);
        }
        
        if (array_key_exists('is_active', $validated) && !$task->is_active) {
            $task->last_completed_at = now();
        }

        $task->save();

        return response()->json(['message' => 'Status tugas diperbarui.', 'data' => $task]);
    }

    /**
     * Delete task
     */
    public function destroy(Request $request, $id)
    {
        $employee = $request->user()->employee;
        
        $task = PersonalTask::where('id', $id)
            ->where('employee_id', $employee->id)
            ->firstOrFail();

        $task->delete();

        return response()->json(['message' => 'Tugas dihapus.']);
    }
}
