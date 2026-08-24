<?php

namespace App\Filament\Resources\AttendanceLogs\Pages;

use App\Filament\Resources\AttendanceLogs\AttendanceLogResource;
use Filament\Resources\Pages\CreateRecord;

class CreateAttendanceLog extends CreateRecord
{
    protected static string $resource = AttendanceLogResource::class;
}
