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
                 'name')
                    ->required(),
                TextInput::make('name')
                    ->required(),
                TextInput::make('code'),
                TextInput::make('quota_per_year')
                    ->required()
                    ->numeric()
                    ->default(12),
                Toggle::make('is_paid')
                    ->required(),
                Toggle::make('requires_attachment')
                    ->required(),
                Toggle::make('is_carry_over_allowed')
                    ->required(),
                TextInput::make('max_carry_over_days')
                    ->required()
                    ->numeric()
                    ->default(0),
                Toggle::make('is_active')
                    ->required(),
            ]);
    }
}
