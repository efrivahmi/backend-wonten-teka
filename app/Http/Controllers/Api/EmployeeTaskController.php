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

        // Get tasks for the specific date, OR tasks without a specific date (recurring habits)
        $tasks = PersonalTask::where('employee_id', $employee->id)
            ->where(function($query) use ($date) {
                $query->whereDate('task_date', $date)
                      ->orWhereNull('task_date'); // Assuming null means everyday or recurring
            })
            ->orderBy('reminder_time', 'asc')
            ->get();

        return response()->json(['data' => $tasks]);
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
            'task_date' => 'required|date',
            'reminder_time' => 'nullable|date_format:H:i',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $task = PersonalTask::create([
            'employee_id' => $employee->id,
            'title' => $request->title,
            'description' => $request->description,
            'task_date' => $request->task_date,
            'reminder_time' => $request->reminder_time,
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

        // Toggle completion status
        $task->is_active = $request->boolean('is_active', !$task->is_active);
        
        if (!$task->is_active) {
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
