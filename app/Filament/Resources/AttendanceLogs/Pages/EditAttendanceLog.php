<?php

namespace App\Filament\Resources\AttendanceLogs\Pages;

use App\Filament\Resources\AttendanceLogs\AttendanceLogResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditAttendanceLog extends EditRecord
{
    protected static string $resource = AttendanceLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
