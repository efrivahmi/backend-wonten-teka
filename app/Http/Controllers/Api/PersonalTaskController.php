<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PersonalTask;
use App\Models\PersonalTaskCompletion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class PersonalTaskController extends Controller
{
    /**
     * List all active personal tasks for the current employee.
     */
    public function index(Request $request)
    {
        $employee = $request->user()->employee;

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $tasks = PersonalTask::where('employee_id', $employee->id)
            ->active()
            ->orderBy('reminder_time', 'asc')
            ->get();

        return response()->json($tasks);
    }

    /**
     * Create a new personal task.
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
            'recurrence_rule' => 'nullable|string', // e.g. "daily", "weekdays"
            'reminder_time' => 'nullable|date_format:H:i',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $task = PersonalTask::create([
            'employee_id' => $employee->id,
            'title' => $request->title,
            'description' => $request->description,
            'recurrence_rule' => $request->recurrence_rule ?? 'daily',
            'reminder_time' => $request->reminder_time,
            'streak_count' => 0,
            'longest_streak' => 0,
            'is_active' => true,
        ]);

        return response()->json(['message' => 'Task created successfully.', 'data' => $task], 201);
    }

    /**
     * Complete a personal task for the current day.
     */
    public function complete(Request $request, PersonalTask $task)
    {
        $employee = $request->user()->employee;

        if (!$employee || $task->employee_id !== $employee->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $today = Carbon::today();

        // Check if already completed today
        $alreadyCompleted = PersonalTaskCompletion::where('personal_task_id', $task->id)
            ->whereDate('completed_date', $today)
            ->exists();

        if ($alreadyCompleted) {
            return response()->json(['message' => 'Task already completed today.'], 400);
        }

        // Logic for tracking streaks
        $lastCompletion = PersonalTaskCompletion::where('personal_task_id', $task->id)
            ->orderBy('completed_date', 'desc')
            ->first();

        $streakCount = $task->streak_count;

        if ($lastCompletion) {
            $lastDate = Carbon::parse($lastCompletion->completed_date);
            
            // Allow completing on weekends or strictly weekdays?
            // For MVP, we'll just check if it was completed yesterday.
            // If they miss a day, streak goes back to 1.
            if ($lastDate->isYesterday()) {
                $streakCount++;
            } else {
                $streakCount = 1; // missed a day, reset streak
            }
        } else {
            $streakCount = 1; // first completion
        }

        $longestStreak = max($streakCount, $task->longest_streak);

        // Record completion
        PersonalTaskCompletion::create([
            'personal_task_id' => $task->id,
            'completed_date' => $today,
        ]);

        // Update task stats
        $task->update([
            'streak_count' => $streakCount,
            'longest_streak' => $longestStreak,
            'last_completed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Task completed!',
            'streak_count' => $streakCount,
            'longest_streak' => $longestStreak,
        ]);
    }
}
