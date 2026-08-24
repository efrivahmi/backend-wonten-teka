<?php

namespace App\Filament\Widgets;

use App\Models\ApprovalInstance;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Database\Eloquent\Builder;
use Filament\Actions\Action;

class PendingApprovalsWidget extends BaseWidget
{
    protected static ?int $sort = 2;
    
    // Polling interval
    protected ?string $pollingInterval = '15s';
    
    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                ApprovalInstance::query()->where('overall_status', 'pending')->latest()
            )
            ->columns([
                Tables\Columns\TextColumn::make('approvable_type')
                    ->label('Type')
                    ->formatStateUsing(fn (string $state): string => class_basename($state)),
                Tables\Columns\TextColumn::make('approvable.employee.full_name')
                    ->label('Requestor')
                    ->default('System/Unknown'),
                Tables\Columns\TextColumn::make('current_step')
                    ->label('Step'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Requested')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([
                // Normally this would redirect to the specific resource,
                // but for a quick widget we can just link to a generic approvals page if it existed.
                Action::make('view')
                    ->label('View')
                    ->icon('heroicon-m-eye')
                    ->url(fn (ApprovalInstance $record): string => '#'),
            ])
            ->defaultPaginationPageOption(5);
    }
}
