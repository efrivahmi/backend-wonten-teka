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
                Select::make('user_id')
                    ->relationship('user', 'name')
                    ->label('Akun Pengguna'),
                TextInput::make('full_name')
                    ->label('Nama Lengkap')
                    ->required(),
                TextInput::make('employee_number')
                    ->label('Nomor Induk Karyawan (Internal)'),
                Textarea::make('nik_encrypted')
                    ->label('NIK KTP')
                    ->columnSpanFull(),
                Textarea::make('npwp_encrypted')
                    ->label('Nomor NPWP')
                    ->columnSpanFull(),
                TextInput::make('phone')
                    ->label('Nomor Telepon')
                    ->tel(),
                TextInput::make('email')
                    ->label('Email Karyawan')
                    ->email(),
                DatePicker::make('date_of_birth')
                    ->label('Tanggal Lahir'),
                Select::make('gender')
                    ->label('Jenis Kelamin')
                    ->options([
                        'male' => 'Laki-laki',
                        'female' => 'Perempuan',
                    ]),
                Textarea::make('address')
                    ->label('Alamat')
                    ->columnSpanFull(),
                TextInput::make('photo_url')
                    ->url(),
                TextInput::make('department')
                    ->label('Departemen'),
                TextInput::make('position')
                    ->label('Posisi / Jabatan'),
                DatePicker::make('join_date')
                    ->label('Tanggal Bergabung'),
                Select::make('employment_status')
                    ->label('Status Kepegawaian')
                    ->options([
                        'permanent' => 'Karyawan Tetap',
                        'contract' => 'Karyawan Kontrak',
                        'probation' => 'Masa Percobaan',
                        'intern' => 'Magang',
                    ])
                    ->required()
                    ->default('permanent'),
                Toggle::make('is_active')
                    ->label('Status Aktif')
                    ->required(),
                Select::make('ptkp_status')
                    ->label('Status PTKP')
                    ->options([
                        'TK/0' => 'TK/0 - Tidak Kawin, 0 Tanggungan',
                        'TK/1' => 'TK/1 - Tidak Kawin, 1 Tanggungan',
                        'TK/2' => 'TK/2 - Tidak Kawin, 2 Tanggungan',
                        'TK/3' => 'TK/3 - Tidak Kawin, 3 Tanggungan',
                        'K/0' => 'K/0 - Kawin, 0 Tanggungan',
                        'K/1' => 'K/1 - Kawin, 1 Tanggungan',
                        'K/2' => 'K/2 - Kawin, 2 Tanggungan',
                        'K/3' => 'K/3 - Kawin, 3 Tanggungan',
                        'K/I/0' => 'K/I/0 - Kawin (Istri Bekerja), 0 Tanggungan',
                        'K/I/1' => 'K/I/1 - Kawin (Istri Bekerja), 1 Tanggungan',
                        'K/I/2' => 'K/I/2 - Kawin (Istri Bekerja), 2 Tanggungan',
                        'K/I/3' => 'K/I/3 - Kawin (Istri Bekerja), 3 Tanggungan',
                    ])
                    ->required()
                    ->default('TK/0'),
                Textarea::make('bpjs_kesehatan_number_encrypted')
                    ->label('Nomor BPJS Kesehatan')
                    ->columnSpanFull(),
                Textarea::make('bpjs_ketenagakerjaan_number_encrypted')
                    ->label('Nomor BPJS Ketenagakerjaan')
                    ->columnSpanFull(),
                TextInput::make('bank_name')
                    ->label('Nama Bank'),
                Textarea::make('bank_account_number_encrypted')
                    ->label('Nomor Rekening Bank')
                    ->columnSpanFull(),
                TextInput::make('bank_account_holder')
                    ->label('Nama Pemilik Rekening'),
                Textarea::make('face_embedding_encrypted')
                    ->columnSpanFull(),
                Toggle::make('face_enrolled')
                    ->required(),
                DateTimePicker::make('face_enrolled_at'),
            ]);
    }
}
