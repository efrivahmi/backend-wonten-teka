<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create Permissions
        $permissions = [
            // Attendance
            'view_own_attendance', 'view_team_attendance', 'view_all_attendance', 'manage_attendance',
            // Employees
            'view_employees', 'create_employees', 'update_employees', 'delete_employees',
            // Leave
            'request_leave', 'approve_leave', 'manage_leave_types', 'view_all_leave',
            // Claims
            'submit_claims', 'approve_claims', 'manage_claim_categories', 'view_all_claims',
            // Payroll
            'view_own_payslip', 'run_payroll', 'finalize_payroll', 'configure_payroll',
            // Calendar & Shifts
            'view_calendar', 'manage_calendar',
            'view_own_shifts', 'manage_shifts',
            // Announcements
            'view_announcements', 'create_announcements', 'manage_announcements',
            // Settings
            'manage_company_settings', 'manage_approval_flows',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        // 2. Create Roles and Assign Permissions

        // Super Admin (Platform-level)
        $superAdmin = Role::findOrCreate('super_admin', 'web');
        // Super admin generally bypasses permissions via a Gate::before rule, but we can assign all just in case
        $superAdmin->syncPermissions(Permission::all());

        // Company Admin (Full access within their tenant)
        $companyAdmin = Role::findOrCreate('company_admin', 'web');
        $companyAdmin->syncPermissions(Permission::all());

        // HR Admin
        $hrAdmin = Role::findOrCreate('hr_admin', 'web');
        $hrAdmin->syncPermissions([
            'view_all_attendance', 'manage_attendance',
            'view_employees', 'create_employees', 'update_employees',
            'manage_leave_types', 'view_all_leave', 'approve_leave',
            'run_payroll', 'configure_payroll',
            'manage_calendar', 'manage_shifts',
            'create_announcements', 'manage_announcements',
            'manage_approval_flows',
        ]);

        // Finance Admin
        $financeAdmin = Role::findOrCreate('finance_admin', 'web');
        $financeAdmin->syncPermissions([
            'view_employees',
            'view_all_claims', 'approve_claims', 'manage_claim_categories',
            'run_payroll', 'finalize_payroll', 'configure_payroll',
            'view_announcements',
        ]);

        // Supervisor / Manager
        $supervisor = Role::findOrCreate('supervisor', 'web');
        $supervisor->syncPermissions([
            'view_own_attendance', 'view_team_attendance',
            'request_leave', 'approve_leave',
            'submit_claims', 'approve_claims',
            'view_own_payslip',
            'view_calendar', 'view_own_shifts',
            'view_announcements',
        ]);

        // Standard Employee
        $employee = Role::findOrCreate('employee', 'web');
        $employee->syncPermissions([
            'view_own_attendance',
            'request_leave',
            'submit_claims',
            'view_own_payslip',
            'view_calendar', 'view_own_shifts',
            'view_announcements',
        ]);
    }
}
