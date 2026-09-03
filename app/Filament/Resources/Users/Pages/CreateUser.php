<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use Filament\Resources\Pages\CreateRecord;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    protected function afterCreate(): void
    {
        $user = $this->record;
        
        // Auto-create employee record if it doesn't exist
        if (!$user->employee) {
            \App\Models\Employee::create([
                'user_id' => $user->id,
                'full_name' => $user->name,
                'email' => $user->email,
                'employee_number' => 'EMP-' . date('Ymd') . '-' . str_pad($user->id, 4, '0', STR_PAD_LEFT),
                'employment_status' => 'permanent',
                'ptkp_status' => 'TK/0',
                'is_active' => true,
                'face_enrolled' => false,
            ]);
        }
    }
}
