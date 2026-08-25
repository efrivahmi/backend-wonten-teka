<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $company = \App\Models\Company::firstOrCreate(
            ['name' => 'Wonten Teka Indonesia'],
            [
                'slug' => 'wonten-teka-indonesia',
                'address' => 'Jl. Jenderal Sudirman No. 1, Jakarta',
                'phone' => '021-12345678',
                'email' => 'contact@wontenteka.com',
            ]
        );

        $user = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Super Admin',
                'password' => bcrypt('password'),
                'is_super_admin' => true,
                'is_active' => true,
                'company_id' => $company->id,
            ]
        );

        \App\Models\Employee::firstOrCreate(
            ['user_id' => $user->id],
            [
                'company_id' => $company->id,
                'employee_number' => 'EMP-001',
                'full_name' => 'Super Admin',
                'department' => 'Management',
                'position' => 'CEO',
                'phone' => '081234567890',
                'join_date' => now(),
                'employment_status' => 'permanent',
                'is_active' => true,
            ]
        );

        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $user->assignRole($role);
    }
}
