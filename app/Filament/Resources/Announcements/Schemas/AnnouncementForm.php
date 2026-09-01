<?php

namespace App\Filament\Resources\Announcements\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class AnnouncementForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('title')
                    ->required(),
                Textarea::make('body')
                    ->required()
                    ->columnSpanFull(),
                TextInput::make('target_type')
                    ->required()
                    ->default('company'),
                TextInput::make('target_value'),
                TextInput::make('priority')
                    ->required()
                    ->default('normal'),
                TextInput::make('created_by')
                    ->required()
                    ->numeric(),
                DateTimePicker::make('published_at'),
                DateTimePicker::make('expires_at'),
            ]);
    }
}
