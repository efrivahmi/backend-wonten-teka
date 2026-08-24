<?php

namespace App\Filament\Resources\ClaimCategories\Pages;

use App\Filament\Resources\ClaimCategories\ClaimCategoryResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListClaimCategories extends ListRecords
{
    protected static string $resource = ClaimCategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
