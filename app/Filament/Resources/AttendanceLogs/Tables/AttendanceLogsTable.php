<?php

namespace App\Filament\Resources\AttendanceLogs\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class AttendanceLogsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('employee.id')
                    ->searchable(),
                TextColumn::make('device.id')
                    ->searchable(),
                TextColumn::make('shiftAssignment.id')
                    ->searchable(),
                TextColumn::make('check_in_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('check_in_latitude')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('check_in_longitude')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('check_in_face_score')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('check_in_photo_url')
                    ->searchable(),
                TextColumn::make('check_out_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('check_out_latitude')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('check_out_longitude')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('check_out_face_score')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('check_out_photo_url')
                    ->searchable(),
                TextColumn::make('status')
                    ->searchable(),
                IconColumn::make('is_flagged')
                    ->boolean(),
                TextColumn::make('work_duration_minutes')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
