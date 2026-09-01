<?php

namespace App\Filament\Resources\ClaimCategories\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class ClaimCategoryForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                 'name')
                    ->required(),
                TextInput::make('name')
                    ->required(),
                TextInput::make('monthly_limit')
                    ->numeric(),
                Toggle::make('requires_receipt')
                    ->required(),
                Toggle::make('is_active')
                    ->required(),
            ]);
    }
}
