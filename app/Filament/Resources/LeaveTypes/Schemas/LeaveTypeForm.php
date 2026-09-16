<?php

namespace App\Filament\Resources\LeaveTypes\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class LeaveTypeForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('code'),
                TextInput::make('quota_per_month')
                    ->label('Kuota per bulan')
                    ->required()
                    ->numeric()
                    ->minValue(0)
                    ->maxValue(31)
                    ->default(1),
                Toggle::make('is_paid')
                    ->required(),
                Toggle::make('requires_attachment')
                    ->required(),
                Toggle::make('is_active')
                    ->required(),
            ]);
    }
}
