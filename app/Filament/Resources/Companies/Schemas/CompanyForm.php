<?php

namespace App\Filament\Resources\Companies\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Forms\Get;
use Filament\Forms\Set;
use Filament\Schemas\Schema;
use Dotswan\MapPicker\Fields\Map;

class CompanyForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Informasi Dasar')
                    ->schema([
                        TextInput::make('name')->required(),
                        TextInput::make('slug')->required(),
                        TextInput::make('logo'),
                        Textarea::make('address')->columnSpanFull(),
                        TextInput::make('phone')->tel(),
                        TextInput::make('email')->label('Email address')->email(),
                        TextInput::make('industry'),
                    ])->columns(2),
                
                Section::make('Geofencing & Lokasi')
                    ->schema([
                        Map::make('location')
                            ->label('Pilih Titik Lokasi Kantor')
                            ->columnSpanFull()
                            ->defaultLocation(latitude: -6.200000, longitude: 106.816666) // Default Jakarta
                            ->afterStateUpdated(function (Get $get, Set $set, string|array|null $old, ?array $state): void {
                                if ($state) {
                                    $set('latitude', $state['lat']);
                                    $set('longitude', $state['lng']);
                                }
                            })
                            ->afterStateHydrated(function ($state, $record, Set $set): void {
                                if ($record && $record->latitude && $record->longitude) {
                                    $set('location', ['lat' => $record->latitude, 'lng' => $record->longitude]);
                                }
                            })
                            ->liveLocation(true, true, 5000)
                            ->showMarker()
                            ->markerColor("#22c55e")
                            ->showFullscreenControl()
                            ->showZoomControl()
                            ->draggable()
                            ->tilesUrl("https://tile.openstreetmap.de/{z}/{x}/{y}.png")
                            ->zoom(15)
                            ->showMyLocationButton()
                            ->dehydrated(false), // Don't save 'location' to DB
                            
                        TextInput::make('latitude')
                            ->numeric()
                            ->required()
                            ->readOnly(),
                            
                        TextInput::make('longitude')
                            ->numeric()
                            ->required()
                            ->readOnly(),
                            
                        TextInput::make('geofence_radius_meters')
                            ->label('Radius Geofence (Meter)')
                            ->numeric()
                            ->default(50)
                            ->required()
                            ->suffix('m'),
                    ])->columns(3),

                Section::make('Pengaturan & Langganan')
                    ->schema([
                        Textarea::make('settings')->columnSpanFull(),
                        TextInput::make('subscription_plan')->required()->default('trial'),
                        TextInput::make('subscription_status')->required()->default('active'),
                        DateTimePicker::make('trial_ends_at'),
                        Toggle::make('is_active')->required(),
                    ])->columns(2),
            ]);
    }
}
