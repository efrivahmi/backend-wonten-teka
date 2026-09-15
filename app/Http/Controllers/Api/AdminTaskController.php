<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PersonalTask;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminTaskController extends Controller
{
    public function index(Request $request)
    {
        $tasks = PersonalTask::with('employee:id,full_name,employee_number')
            ->when($request->filled('employee_id'), fn ($query) => $query->where('employee_id', $request->integer('employee_id')))
            ->when($request->filled('type'), fn ($query) => $query->where('is_habit', $request->input('type') === 'habit'))
            ->latest()
            ->paginate(30);

        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $data = $this->validateTask($request);
        $task = PersonalTask::create($data + ['is_active' => true]);

        return response()->json(['message' => 'Tugas karyawan dibuat.', 'data' => $task->load('employee:id,full_name,employee_number')], 201);
    }

    public function update(Request $request, PersonalTask $task)
    {
        $task->update($this->validateTask($request, $task));

        return response()->json(['message' => 'Tugas karyawan diperbarui.', 'data' => $task->fresh()->load('employee:id,full_name,employee_number')]);
    }

    public function destroy(PersonalTask $task)
    {
        $task->delete();

        return response()->json(['message' => 'Tugas karyawan dihapus.']);
    }

    private function validateTask(Request $request, ?PersonalTask $task = null): array
    {
        return $request->validate([
            'employee_id' => [$task ? 'sometimes' : 'required', 'integer', Rule::exists('employees', 'id')],
            'title' => [$task ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => 'nullable|string|max:1000',
            'task_date' => 'nullable|date',
            'is_habit' => 'required|boolean',
            'recurrence_rule' => 'nullable|in:daily,weekdays,weekly',
            'reminder_time' => 'nullable|date_format:H:i',
            'reminder_enabled' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);
    }
}
