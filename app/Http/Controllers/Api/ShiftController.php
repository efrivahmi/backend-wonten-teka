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
        
        $shiftClock = app(\App\Services\ShiftTimeService::class);
        $businessNow = $shiftClock->now();
        $businessToday = $businessNow->copy()->startOfDay();

        $shifts = ShiftAssignment::where('employee_id', $employee->id)
            ->with('shiftTemplate')
            ->whereDate('date', '>=', $businessToday->toDateString())
            ->orderBy('date', 'asc')
            ->paginate(15);

        $explicit = $shifts->getCollection()->groupBy(fn ($item) => $item->date->toDateString());
        $recurring = RecurringShiftAssignment::where('employee_id', $employee->id)
            ->with('shiftTemplate')
            ->get()
            ->groupBy('day_of_week');
        $default = ShiftTemplate::active()->where('is_default', true)->first();
        $schedule = collect();

        $workingDaysSetting = \App\Models\Setting::where('key', 'working_days')->first();
        $workingDays = $workingDaysSetting ? $workingDaysSetting->value : [1, 2, 3, 4, 5, 6];
        if (is_string($workingDays)) {
            $workingDays = json_decode($workingDays, true);
        }

        foreach (range(0, 6) as $offset) {
            $date = $businessToday->copy()->addDays($offset);
            $hasDefault = false;

            if ($offset === 0) {
                $yesterday = $businessToday->copy()->subDay();
                $yesterdayShifts = app(\App\Services\AttendanceAbsenceService::class)->shiftsFor($employee->id, $yesterday);
                foreach ($yesterdayShifts as $shiftData) {
                    $template = $shiftData['template'];
                    $start = Carbon::parse($template->start_time);
                    $end = Carbon::parse($template->end_time);
                    if ($end->lessThanOrEqualTo($start)) {
                        $schedule->push([
                            'id' => -999 - $template->id,
                            'employee_id' => $employee->id,
                            'shift_template_id' => $template->id,
                            'date' => $businessToday->toDateString(), // Show it on today's UI card
                            'is_recurring_schedule' => $shiftData['assignment_id'] === null,
                            'is_default_schedule' => $template->is_default,
                            'shift_template' => (object) array_merge($template->toArray(), [
                                'name' => $template->name . ' (Lanjutan Kemarin)',
                            ]),
                        ]);
                    }
                }
            }

            if ($explicit->has($date->toDateString())) {
                $explicit->get($date->toDateString())->each(function ($item) use ($schedule, &$hasDefault) {
                    if ($item->shiftTemplate && $item->shiftTemplate->is_default) {
                        $hasDefault = true;
                    }
                    $arrayItem = $item->toArray();
                    $arrayItem['date'] = $item->date->toDateString();
                    $arrayItem['shift_template'] = $item->shiftTemplate;
                    $schedule->push($arrayItem);
                });
            }

            $weekly = ($recurring->get($date->dayOfWeekIso) ?? collect())->filter(fn ($item) =>
                (!$item->starts_on || $date->gte($item->starts_on)) &&
                (!$item->ends_on || $date->lte($item->ends_on))
            );

            foreach ($weekly as $item) {
                if ($item->shiftTemplate && $item->shiftTemplate->is_default) {
                    $hasDefault = true;
                }
            }

            // A default template is a fallback rule. Show it once for today so the schedule stays clear.
            if (!$hasDefault && $offset === 0 && $default && in_array($date->dayOfWeekIso, $workingDays)) {
                $weekly->push((object) [
                    'shift_template_id' => $default->id,
                    'shiftTemplate' => $default,
                    'is_default_schedule' => true,
                ]);
            }

            foreach ($weekly as $index => $item) {
                // Avoid pushing if explicitly assigned
                if (!$explicit->has($date->toDateString()) || !$explicit->get($date->toDateString())->contains('shift_template_id', $item->shift_template_id)) {
                    $schedule->push([
                        'id' => -(($offset + 1) * 100 + $index),
                        'employee_id' => $employee->id,
                        'shift_template_id' => $item->shift_template_id,
                        'date' => $date->toDateString(),
                        'is_recurring_schedule' => !isset($item->is_default_schedule),
                        'is_default_schedule' => isset($item->is_default_schedule),
                        'shift_template' => $item->shiftTemplate,
                    ]);
                }
            }
        }

        $shifts->setCollection($schedule);
            
        return response()->json($shifts);
    }
}
