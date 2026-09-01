<?php

namespace App\Filament\Resources\ShiftTemplates\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\TimePicker;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class ShiftTemplateForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                 'name')
                    ->required(),
                TextInput::make('name')
                    ->required(),
                TimePicker::make('start_time')
                    ->required(),
                TimePicker::make('end_time')
                    ->required(),
                TextInput::make('grace_period_minutes')
                    ->required()
                    ->numeric()
                    ->default(15),
                Toggle::make('is_default')
                    ->required(),
                Toggle::make('is_active')
                    ->required(),
            ]);
    }
}
