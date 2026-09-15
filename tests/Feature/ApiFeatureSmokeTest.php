<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ApiFeatureSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_employee_read_features_return_successful_responses(): void
    {
        [$user] = $this->employeeAccount();
        Sanctum::actingAs($user);

        $paths = [
            '/api/me',
            '/api/notifications',
            '/api/app-config',
            '/api/employee/options',
            '/api/employee/directory',
            '/api/biometrics/status',
            '/api/attendance/today-info',
            '/api/attendance/history',
            '/api/attendance/adjustment',
            '/api/attendance/business-trip',
            '/api/overtime/history',
            '/api/leave/types',
            '/api/leave/balances',
            '/api/leave/history',
            '/api/claims/categories',
            '/api/claims/history',
            '/api/payslips',
            '/api/shifts/upcoming',
            '/api/calendar',
            '/api/announcements',
            '/api/tasks',
            '/api/company/geofence',
            '/api/company/working-days',
        ];

        foreach ($paths as $path) {
            $this->getJson($path)->assertOk("Employee feature failed: {$path}");
        }
    }

    public function test_employee_task_create_update_complete_and_delete_workflow(): void
    {
        [$user] = $this->employeeAccount();
        Sanctum::actingAs($user);

        $taskId = $this->postJson('/api/tasks', [
            'title' => 'Test tugas',
            'task_date' => today()->toDateString(),
            'reminder_time' => '09:00',
        ])->assertCreated()->json('data.id');

        $this->putJson("/api/tasks/{$taskId}", ['is_active' => true])->assertOk();
        $this->postJson("/api/tasks/{$taskId}/complete")->assertOk();
        $this->deleteJson("/api/tasks/{$taskId}")->assertOk();
    }

    public function test_all_admin_read_features_return_successful_responses(): void
    {
        [$admin] = $this->employeeAccount(true);
        Sanctum::actingAs($admin);

        $paths = [
            '/api/admin/dashboard',
            '/api/admin/employees',
            '/api/admin/events',
            '/api/admin/payroll/runs',
            '/api/admin/shifts',
            '/api/admin/shift-assignments',
            '/api/admin/leave-types',
            '/api/admin/attendance',
            '/api/admin/attendance-security-events',
            '/api/admin/devices/pending',
            '/api/admin/biometrics',
            '/api/approvals/pending',
        ];

        foreach ($paths as $path) {
            $this->getJson($path)->assertOk("Admin feature failed: {$path}");
        }
    }

    private function employeeAccount(bool $admin = false): array
    {
        $user = User::factory()->create([
            'is_active' => true,
            'is_super_admin' => $admin,
        ]);
        if ($admin) {
            Role::findOrCreate('admin', 'web');
            $user->assignRole('admin');
        }
        $employee = Employee::create([
            'user_id' => $user->id,
            'full_name' => $user->name,
            'email' => $user->email,
            'department' => 'IT',
        ]);

        return [$user, $employee];
    }
}
