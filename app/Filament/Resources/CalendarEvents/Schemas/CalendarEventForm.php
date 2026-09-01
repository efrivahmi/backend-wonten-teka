<?php

namespace App\Filament\Resources\CalendarEvents\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TimePicker;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class CalendarEventForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('title')
                    ->required(),
                Textarea::make('description')
                    ->columnSpanFull(),
                TextInput::make('type')
                    ->required()
                    ->default('holiday'),
                TextInput::make('scope')
                    ->required()
                    ->default('company'),
                TextInput::make('department'),
                DatePicker::make('start_date')
                    ->required(),
                DatePicker::make('end_date')
                    ->required(),
                TimePicker::make('start_time'),
                TimePicker::make('end_time'),
                Toggle::make('is_recurring')
                    ->required(),
                TextInput::make('recurrence_rule'),
                TextInput::make('created_by')
                    ->numeric(),
            ]);
    }
}
