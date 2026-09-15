<?php

namespace Tests\Feature;

use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\ShiftAssignment;
use App\Models\ShiftTemplate;
use App\Models\User;
use App\Services\AttendanceAbsenceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceAbsenceServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_records_alpha_after_shift_end_and_is_idempotent(): void
    {
        $employee = $this->employee();
        $shift = $this->shift('08:00', '17:00');
        $assignment = ShiftAssignment::create([
            'employee_id' => $employee->id,
            'shift_template_id' => $shift->id,
            'date' => '2026-09-15',
        ]);
        $now = Carbon::parse('2026-09-15 17:00:00', 'Asia/Jakarta');

        $service = app(AttendanceAbsenceService::class);

        $this->assertSame(1, $service->recordEndedShifts($now));
        $this->assertSame(0, $service->recordEndedShifts($now));
        $this->assertDatabaseHas('attendance_logs', [
            'employee_id' => $employee->id,
            'shift_assignment_id' => $assignment->id,
            'status' => 'absent',
            'is_flagged' => false,
        ]);
    }

    public function test_it_does_not_record_alpha_before_shift_end_or_when_checked_in(): void
    {
        $employee = $this->employee();
        $shift = $this->shift('08:00', '17:00');
        $assignment = ShiftAssignment::create([
            'employee_id' => $employee->id,
            'shift_template_id' => $shift->id,
            'date' => '2026-09-15',
        ]);
        $service = app(AttendanceAbsenceService::class);

        $this->assertSame(0, $service->recordEndedShifts(
            Carbon::parse('2026-09-15 16:59:59', 'Asia/Jakarta'),
        ));

        AttendanceLog::create([
            'employee_id' => $employee->id,
            'shift_assignment_id' => $assignment->id,
            'check_in_at' => Carbon::parse('2026-09-15 08:01:00', 'Asia/Jakarta')->utc(),
            'status' => 'late',
        ]);

        $this->assertSame(0, $service->recordEndedShifts(
            Carbon::parse('2026-09-15 17:00:00', 'Asia/Jakarta'),
        ));
        $this->assertSame(1, AttendanceLog::count());
        $this->assertSame('late', AttendanceLog::first()->status);
    }

    public function test_it_records_an_overnight_shift_for_the_previous_work_date(): void
    {
        $employee = $this->employee();
        $shift = $this->shift('22:00', '06:00');
        ShiftAssignment::create([
            'employee_id' => $employee->id,
            'shift_template_id' => $shift->id,
            'date' => '2026-09-14',
        ]);

        $created = app(AttendanceAbsenceService::class)->recordEndedShifts(
            Carbon::parse('2026-09-15 06:00:00', 'Asia/Jakarta'),
        );

        $this->assertSame(1, $created);
        $this->assertDatabaseHas('attendance_logs', [
            'employee_id' => $employee->id,
            'status' => 'absent',
        ]);
    }

    private function employee(): Employee
    {
        $user = User::factory()->create(['is_active' => true]);

        return Employee::create([
            'user_id' => $user->id,
            'full_name' => $user->name,
            'email' => $user->email,
            'department' => 'IT',
            'is_active' => true,
        ]);
    }

    private function shift(string $start, string $end): ShiftTemplate
    {
        return ShiftTemplate::create([
            'name' => 'Shift Test',
            'category' => 'Reguler',
            'start_time' => $start,
            'end_time' => $end,
            'grace_period_minutes' => 15,
            'is_default' => false,
            'is_active' => true,
        ]);
    }
}
