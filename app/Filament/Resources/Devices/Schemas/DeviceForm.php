<?php

namespace App\Filament\Resources\Devices\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class DeviceForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('employee_id')
                    ->relationship('employee', 'id')
                    ->required(),
                TextInput::make('device_fingerprint')
                    ->required(),
                TextInput::make('device_name'),
                TextInput::make('device_model'),
                TextInput::make('os_version'),
                TextInput::make('app_version'),
                TextInput::make('status')
                    ->required()
                    ->default('pending_approval'),
                TextInput::make('approved_by')
                    ->numeric(),
                DateTimePicker::make('approved_at'),
                DateTimePicker::make('last_used_at'),
            ]);
    }
}
