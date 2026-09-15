<?php

namespace App\Services;

use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\RecurringShiftAssignment;
use App\Models\Setting;
use App\Models\ShiftAssignment;
use App\Models\ShiftTemplate;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AttendanceAbsenceService
{
    public function __construct(private readonly ShiftTimeService $shiftClock)
    {
    }

    public function recordEndedShifts(?Carbon $now = null): int
    {
        $now ??= $this->shiftClock->now();
        $created = 0;

        Employee::active()->select('id')->chunkById(100, function ($employees) use ($now, &$created) {
            foreach ($employees as $employee) {
                foreach ([$now->copy()->subDay(), $now] as $workDate) {
                    foreach ($this->shiftsFor($employee->id, $workDate) as $shift) {
                        $endAt = $this->shiftClock->scheduledEnd(
                            $shift['template']->start_time->format('H:i'),
                            $shift['template']->end_time->format('H:i'),
                            $workDate,
                        );
                        if ($now->greaterThanOrEqualTo($endAt)) {
                            $created += $this->recordAbsence(
                                $employee->id,
                                $shift['template'],
                                $shift['assignment_id'],
                                $workDate,
                            ) ? 1 : 0;
                        }
                    }
                }
            }
        });

        return $created;
    }

    public function recordAbsence(
        int $employeeId,
        ShiftTemplate $template,
        ?int $assignmentId,
        Carbon $workDate,
    ): bool {
        [$dayStartUtc, $dayEndUtc] = $this->shiftClock->utcDayBounds($workDate);
        $query = AttendanceLog::where('employee_id', $employeeId)
            ->whereBetween('check_in_at', [$dayStartUtc, $dayEndUtc]);

        if ($assignmentId !== null) {
            $query->where('shift_assignment_id', $assignmentId);
        } else {
            $query->whereNull('shift_assignment_id')
                ->where('flags->shift_template_id', $template->id);
        }

        if ($query->exists()) {
            return false;
        }

        $startAt = $this->shiftClock->scheduledStart(
            $template->start_time->format('H:i'),
            $workDate,
        );
        $endAt = $this->shiftClock->scheduledEnd(
            $template->start_time->format('H:i'),
            $template->end_time->format('H:i'),
            $workDate,
        );

        AttendanceLog::create([
            'employee_id' => $employeeId,
            'shift_assignment_id' => $assignmentId,
            // Scheduled start anchors the record to its work date. The flag below
            // explicitly distinguishes it from an actual employee check-in.
            'check_in_at' => $startAt->copy()->utc(),
            'status' => 'absent',
            'is_flagged' => false,
            'flags' => [
                'auto_absent' => true,
                'shift_template_id' => $template->id,
                'shift_name' => $template->name,
                'scheduled_start_at' => $startAt->toIso8601String(),
                'scheduled_end_at' => $endAt->toIso8601String(),
            ],
        ]);

        return true;
    }

    /** @return Collection<int, array{template: ShiftTemplate, assignment_id: ?int}> */
    private function shiftsFor(int $employeeId, Carbon $date): Collection
    {
        $assignments = ShiftAssignment::where('employee_id', $employeeId)
            ->whereDate('date', $date->toDateString())
            ->with('shiftTemplate')
            ->get()
            ->filter(fn ($assignment) => $assignment->shiftTemplate?->is_active)
            ->map(fn ($assignment) => [
                'template' => $assignment->shiftTemplate,
                'assignment_id' => $assignment->id,
            ]);

        if ($assignments->isNotEmpty()) {
            return $assignments->values();
        }

        $recurring = RecurringShiftAssignment::where('employee_id', $employeeId)
            ->where('day_of_week', $date->dayOfWeekIso)
            ->where(fn ($query) => $query->whereNull('starts_on')->orWhereDate('starts_on', '<=', $date))
            ->where(fn ($query) => $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', $date))
            ->with('shiftTemplate')
            ->get()
            ->filter(fn ($assignment) => $assignment->shiftTemplate?->is_active)
            ->map(fn ($assignment) => [
                'template' => $assignment->shiftTemplate,
                'assignment_id' => null,
            ]);

        if ($recurring->isNotEmpty()) {
            return $recurring->values();
        }

        $workingDays = Setting::where('key', 'working_days')->value('value') ?? [1, 2, 3, 4, 5, 6];
        if (is_string($workingDays)) {
            $workingDays = json_decode($workingDays, true) ?: [];
        }
        if (!in_array($date->dayOfWeekIso, $workingDays, true)) {
            return collect();
        }

        $default = ShiftTemplate::active()->where('is_default', true)->first();

        return $default
            ? collect([['template' => $default, 'assignment_id' => null]])
            : collect();
    }
}
