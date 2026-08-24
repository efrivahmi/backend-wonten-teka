<?php

namespace App\Filament\Resources\ClaimCategories;

use App\Filament\Resources\ClaimCategories\Pages\CreateClaimCategory;
use App\Filament\Resources\ClaimCategories\Pages\EditClaimCategory;
use App\Filament\Resources\ClaimCategories\Pages\ListClaimCategories;
use App\Filament\Resources\ClaimCategories\Schemas\ClaimCategoryForm;
use App\Filament\Resources\ClaimCategories\Tables\ClaimCategoriesTable;
use App\Models\ClaimCategory;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class ClaimCategoryResource extends Resource
{
    protected static ?string $model = ClaimCategory::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return ClaimCategoryForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return ClaimCategoriesTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListClaimCategories::route('/'),
            'create' => CreateClaimCategory::route('/create'),
            'edit' => EditClaimCategory::route('/{record}/edit'),
        ];
    }
}
