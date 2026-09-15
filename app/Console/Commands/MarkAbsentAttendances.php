<?php

namespace App\Console\Commands;

use App\Services\AttendanceAbsenceService;
use Illuminate\Console\Command;

class MarkAbsentAttendances extends Command
{
    protected $signature = 'attendance:mark-absent';
    protected $description = 'Record Alpha for employees who missed an ended shift';

    public function handle(AttendanceAbsenceService $service): int
    {
        $count = $service->recordEndedShifts();
        $this->info("Recorded {$count} absent attendance record(s).");

        return self::SUCCESS;
    }
}
