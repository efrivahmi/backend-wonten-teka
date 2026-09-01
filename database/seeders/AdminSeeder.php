<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'admin@wontenteka.com'],
            [
                'name' => 'Super Admin',
                'password' => bcrypt('password'),
                'is_super_admin' => true,
                'is_active' => true,
            ]
        );

        \App\Models\Employee::firstOrCreate(
            ['user_id' => $user->id],
            [
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
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'web']);
        $user->assignRole($role);
    }
}
