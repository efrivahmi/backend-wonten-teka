<?php

namespace App\Filament\Resources\Employees\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class EmployeeForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('company_id')
                    ->relationship('company', 'name')
                    ->required(),
                Select::make('user_id')
                    ->relationship('user', 'name'),
                TextInput::make('full_name')
                    ->required(),
                TextInput::make('employee_number'),
                Textarea::make('nik_encrypted')
                    ->columnSpanFull(),
                Textarea::make('npwp_encrypted')
                    ->columnSpanFull(),
                TextInput::make('phone')
                    ->tel(),
                TextInput::make('email')
                    ->label('Email address')
                    ->email(),
                DatePicker::make('date_of_birth'),
                TextInput::make('gender'),
                Textarea::make('address')
                    ->columnSpanFull(),
                TextInput::make('photo_url')
                    ->url(),
                TextInput::make('department'),
                TextInput::make('position'),
                DatePicker::make('join_date'),
                TextInput::make('employment_status')
                    ->required()
                    ->default('permanent'),
                Toggle::make('is_active')
                    ->required(),
                TextInput::make('ptkp_status')
                    ->required()
                    ->default('TK/0'),
                Textarea::make('bpjs_kesehatan_number_encrypted')
                    ->columnSpanFull(),
                Textarea::make('bpjs_ketenagakerjaan_number_encrypted')
                    ->columnSpanFull(),
                TextInput::make('bank_name'),
                Textarea::make('bank_account_number_encrypted')
                    ->columnSpanFull(),
                TextInput::make('bank_account_holder'),
                Textarea::make('face_embedding_encrypted')
                    ->columnSpanFull(),
                Toggle::make('face_enrolled')
                    ->required(),
                DateTimePicker::make('face_enrolled_at'),
            ]);
    }
}
