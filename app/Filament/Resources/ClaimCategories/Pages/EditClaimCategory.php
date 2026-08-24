<?php

namespace App\Filament\Resources\ClaimCategories\Pages;

use App\Filament\Resources\ClaimCategories\ClaimCategoryResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditClaimCategory extends EditRecord
{
    protected static string $resource = ClaimCategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
