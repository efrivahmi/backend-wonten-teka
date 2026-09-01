<?php

namespace App\Filament\Resources\PayrollComponents\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class PayrollComponentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('code'),
                TextInput::make('type')
                    ->required(),
                Toggle::make('is_taxable')
                    ->required(),
                TextInput::make('default_amount')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('applies_to')
                    ->required()
                    ->default('all'),
                Toggle::make('is_active')
                    ->required(),
                TextInput::make('sort_order')
                    ->required()
                    ->numeric()
                    ->default(0),
            ]);
    }
}
