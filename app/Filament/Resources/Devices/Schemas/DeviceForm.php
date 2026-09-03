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
                Select::make('status')
                    ->options([
                        'active' => 'Active',
                        'pending_approval' => 'Pending Approval',
                        'revoked' => 'Revoked',
                    ])
                    ->required()
                    ->default('pending_approval'),
                Select::make('approved_by')
                    ->relationship('approvedByUser', 'name'),
                DateTimePicker::make('approved_at'),
                DateTimePicker::make('last_used_at'),
            ]);
    }
}
