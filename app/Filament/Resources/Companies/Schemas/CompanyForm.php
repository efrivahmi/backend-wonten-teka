<?php

namespace App\Filament\Resources\Companies\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class CompanyForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('slug')
                    ->required(),
                TextInput::make('logo'),
                Textarea::make('address')
                    ->columnSpanFull(),
                TextInput::make('phone')
                    ->tel(),
                TextInput::make('email')
                    ->label('Email address')
                    ->email(),
                TextInput::make('industry'),
                Textarea::make('settings')
                    ->columnSpanFull(),
                TextInput::make('subscription_plan')
                    ->required()
                    ->default('trial'),
                TextInput::make('subscription_status')
                    ->required()
                    ->default('active'),
                DateTimePicker::make('trial_ends_at'),
                Toggle::make('is_active')
                    ->required(),
            ]);
    }
}
