<?php

namespace App\Filament\Resources\AttendanceLogs\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class AttendanceLogForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('company_id')
                    ->relationship('company', 'name')
                    ->required(),
                Select::make('employee_id')
                    ->relationship('employee', 'id')
                    ->required(),
                Select::make('device_id')
                    ->relationship('device', 'id'),
                Select::make('shift_assignment_id')
                    ->relationship('shiftAssignment', 'id'),
                DateTimePicker::make('check_in_at'),
                TextInput::make('check_in_latitude')
                    ->numeric(),
                TextInput::make('check_in_longitude')
                    ->numeric(),
                TextInput::make('check_in_face_score')
                    ->numeric(),
                TextInput::make('check_in_photo_url')
                    ->url(),
                DateTimePicker::make('check_out_at'),
                TextInput::make('check_out_latitude')
                    ->numeric(),
                TextInput::make('check_out_longitude')
                    ->numeric(),
                TextInput::make('check_out_face_score')
                    ->numeric(),
                TextInput::make('check_out_photo_url')
                    ->url(),
                TextInput::make('status')
                    ->required()
                    ->default('present'),
                Textarea::make('flags')
                    ->columnSpanFull(),
                Toggle::make('is_flagged')
                    ->required(),
                Textarea::make('notes')
                    ->columnSpanFull(),
                Textarea::make('admin_notes')
                    ->columnSpanFull(),
                TextInput::make('work_duration_minutes')
                    ->numeric(),
            ]);
    }
}
