<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShiftAssignment;
use Illuminate\Http\Request;
use App\Models\ShiftTemplate;
use Carbon\Carbon;
use App\Models\RecurringShiftAssignment;

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

        $explicit = $shifts->getCollection()->groupBy(fn ($item) => $item->date->toDateString());
        $recurring = RecurringShiftAssignment::where('employee_id', $employee->id)
            ->with('shiftTemplate')
            ->get()
            ->groupBy('day_of_week');
        $default = ShiftTemplate::active()->where('is_default', true)->first();
        $schedule = collect();

        foreach (range(0, 6) as $offset) {
            $date = Carbon::today()->addDays($offset);
            if ($explicit->has($date->toDateString())) {
                $explicit->get($date->toDateString())->each(fn ($item) => $schedule->push($item));
                continue;
            }

            $weekly = ($recurring->get($date->dayOfWeekIso) ?? collect())->filter(fn ($item) =>
                (!$item->starts_on || $date->gte($item->starts_on)) &&
                (!$item->ends_on || $date->lte($item->ends_on))
            );
            // A default template is a fallback rule, not seven separate
            // assignments. Show it once for today so the schedule stays clear.
            $effective = $weekly->isNotEmpty()
                ? $weekly
                : ($offset === 0 && $default
                    ? collect([(object) ['shift_template_id' => $default->id, 'shiftTemplate' => $default]])
                    : collect());

            foreach ($effective as $index => $item) {
                $schedule->push([
                    'id' => -(($offset + 1) * 100 + $index),
                    'employee_id' => $employee->id,
                    'shift_template_id' => $item->shift_template_id,
                    'date' => $date->toDateString(),
                    'is_recurring_schedule' => $weekly->isNotEmpty(),
                    'is_default_schedule' => $weekly->isEmpty(),
                    'shift_template' => $item->shiftTemplate,
                ]);
            }
        }

        $shifts->setCollection($schedule);
            
        return response()->json($shifts);
    }
}
