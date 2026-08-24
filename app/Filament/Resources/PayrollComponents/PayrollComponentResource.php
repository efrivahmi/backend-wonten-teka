<?php

namespace App\Filament\Resources\PayrollComponents;

use App\Filament\Resources\PayrollComponents\Pages\CreatePayrollComponent;
use App\Filament\Resources\PayrollComponents\Pages\EditPayrollComponent;
use App\Filament\Resources\PayrollComponents\Pages\ListPayrollComponents;
use App\Filament\Resources\PayrollComponents\Schemas\PayrollComponentForm;
use App\Filament\Resources\PayrollComponents\Tables\PayrollComponentsTable;
use App\Models\PayrollComponent;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class PayrollComponentResource extends Resource
{
    protected static ?string $model = PayrollComponent::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return PayrollComponentForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return PayrollComponentsTable::configure($table);
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
            'index' => ListPayrollComponents::route('/'),
            'create' => CreatePayrollComponent::route('/create'),
            'edit' => EditPayrollComponent::route('/{record}/edit'),
        ];
    }
}
