<?php

namespace App\Filament\Resources\PayrollComponents\Pages;

use App\Filament\Resources\PayrollComponents\PayrollComponentResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditPayrollComponent extends EditRecord
{
    protected static string $resource = PayrollComponentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
