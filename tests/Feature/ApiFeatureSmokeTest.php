<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use App\Models\LeaveType;
use App\Models\AttendanceLog;
use Carbon\Carbon;
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

    public function test_employee_can_create_habit_and_enable_reminder(): void
    {
        [$user] = $this->employeeAccount();
        Sanctum::actingAs($user);

        $habitId = $this->postJson('/api/tasks', [
            'title' => 'Olahraga pagi',
            'is_habit' => true,
            'recurrence_rule' => 'daily',
            'reminder_time' => '07:00',
            'reminder_enabled' => true,
        ])->assertCreated()
            ->assertJsonPath('data.is_habit', true)
            ->assertJsonPath('data.reminder_enabled', true)
            ->json('data.id');

        $this->getJson('/api/tasks?type=habit')
            ->assertOk()
            ->assertJsonPath('data.0.id', $habitId);

        $this->putJson("/api/tasks/{$habitId}", [
            'reminder_enabled' => false,
        ])->assertOk()->assertJsonPath('data.reminder_enabled', false);
    }

    public function test_monthly_statistics_use_the_current_calendar_month(): void
    {
        [$user] = $this->employeeAccount();
        Sanctum::actingAs($user);

        $this->getJson('/api/attendance/today-info')
            ->assertOk()
            ->assertJsonPath('monthly_stats.present_days', 0)
            ->assertJsonPath('has_double_shift', false)
            ->assertJsonCount(0, 'overtime_today')
            ->assertJsonPath('monthly_stats.days_in_month', now(config('app.business_timezone'))->daysInMonth)
            ->assertJsonPath('monthly_stats.month_label', now(config('app.business_timezone'))->locale('id')->translatedFormat('F Y'));
    }

    public function test_employee_can_only_create_and_read_attendance_adjustments(): void
    {
        [$user] = $this->employeeAccount();
        Sanctum::actingAs($user);

        $id = $this->postJson('/api/attendance/adjustment', [
            'date' => today()->subDay()->toDateString(),
            'check_in' => '08:00',
            'check_out' => '17:00',
            'reason' => 'Lupa melakukan check-out.',
        ])->assertOk()->json('data.id');

        $this->getJson('/api/attendance/adjustment')
            ->assertOk()
            ->assertJsonPath('data.0.id', $id);

        $this->putJson("/api/attendance/adjustment/{$id}", ['reason' => 'Diubah'])
            ->assertNotFound();
        $this->deleteJson("/api/attendance/adjustment/{$id}")
            ->assertNotFound();
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
            '/api/admin/devices/active',
            '/api/admin/biometrics',
            '/api/approvals/pending',
        ];

        foreach ($paths as $path) {
            $this->getJson($path)->assertOk("Admin feature failed: {$path}");
        }
    }

    public function test_admin_creates_only_initial_account_and_employee_completes_profile_without_number_collision(): void
    {
        [$admin] = $this->employeeAccount(true);
        Sanctum::actingAs($admin);

        $creationResponse = $this->postJson('/api/admin/employees', [
            'email' => 'karyawan.baru@example.test',
            'password' => 'rahasia123',
        ]);
        $this->assertSame(201, $creationResponse->status(), $creationResponse->getContent());
        $employeeId = $creationResponse
            ->assertJsonPath('data.department', null)
            ->assertJsonPath('data.position', null)
            ->json('data.id');

        $employee = Employee::findOrFail($employeeId);
        $generatedNumber = $employee->employee_number;
        $this->assertNotEmpty($generatedNumber);
        $this->assertMatchesRegularExpression('/^EMP-\d{4}-\d{4}(?:-\d+)?$/', $generatedNumber);
        $this->assertTrue($employee->user->hasRole('employee'));

        Sanctum::actingAs($employee->user);
        $completionResponse = $this->postJson('/api/employee/complete-profile', [
            'full_name' => 'Karyawan Baru Lengkap',
            'email' => 'karyawan.baru@example.test',
            'phone' => '081234567890',
            'nik' => '3201010101010001',
            'gender' => 'male',
            'address' => 'Jakarta',
            'employment_status' => 'permanent',
        ]);
        $this->assertSame(201, $completionResponse->status(), $completionResponse->getContent());
        $completionResponse->assertJsonPath('user.name', 'Karyawan Baru Lengkap');

        $this->assertSame($generatedNumber, $employee->fresh()->employee_number);
        $this->assertSame('Jakarta', $employee->fresh()->address);
        $this->assertSame('Karyawan Baru Lengkap', $employee->user->fresh()->name);
    }

    public function test_admin_can_create_an_admin_account_with_role_based_identifier(): void
    {
        [$admin] = $this->employeeAccount(true);
        Sanctum::actingAs($admin);

        $employeeId = $this->postJson('/api/admin/employees', [
            'email' => 'admin.baru@example.test',
            'password' => 'rahasia123',
            'role' => 'admin',
        ])->assertCreated()->json('data.id');

        $employee = Employee::findOrFail($employeeId);
        $this->assertMatchesRegularExpression('/^ADM-\d{4}-\d{4}(?:-\d+)?$/', $employee->employee_number);
        $this->assertTrue($employee->user->hasRole('admin'));
    }

    public function test_admin_can_manage_daily_tasks_used_by_web_and_mobile(): void
    {
        [$admin] = $this->employeeAccount(true);
        [, $employee] = $this->employeeAccount();
        Sanctum::actingAs($admin);

        $taskId = $this->postJson('/api/admin/tasks', [
            'employee_id' => $employee->id,
            'title' => 'Laporan harian',
            'task_date' => today()->toDateString(),
            'is_habit' => false,
            'reminder_time' => '16:00',
            'reminder_enabled' => true,
        ])->assertCreated()->json('data.id');

        $this->getJson('/api/admin/tasks')->assertOk()
            ->assertJsonPath('data.0.id', $taskId);
        $this->putJson("/api/admin/tasks/{$taskId}", [
            'title' => 'Laporan harian diperbarui',
            'is_habit' => false,
        ])->assertOk()->assertJsonPath('data.title', 'Laporan harian diperbarui');
        $this->deleteJson("/api/admin/tasks/{$taskId}")->assertOk();
        $this->assertDatabaseMissing('personal_tasks', ['id' => $taskId]);
    }

    public function test_admin_attendance_draft_filters_selected_employee_and_period(): void
    {
        [$admin] = $this->employeeAccount(true);
        [, $selected] = $this->employeeAccount();
        [, $other] = $this->employeeAccount();
        $inPeriod = Carbon::parse('2026-09-15 08:00', config('app.business_timezone'))->utc();
        $outsidePeriod = Carbon::parse('2026-08-15 08:00', config('app.business_timezone'))->utc();

        $selectedLog = AttendanceLog::create([
            'employee_id' => $selected->id,
            'check_in_at' => $inPeriod,
            'status' => 'on_time',
            'check_in_address' => 'Kantor pusat',
            'check_in_face_score' => .98,
        ]);
        AttendanceLog::create(['employee_id' => $other->id, 'check_in_at' => $inPeriod, 'status' => 'late']);
        AttendanceLog::create(['employee_id' => $selected->id, 'check_in_at' => $outsidePeriod, 'status' => 'on_time']);

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/attendance?employee_ids={$selected->id}&month=9&year=2026&per_page=500")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.employee_id', $selected->id);

        $this->getJson("/api/admin/attendance/{$selectedLog->id}")
            ->assertOk()
            ->assertJsonPath('data.employee.id', $selected->id)
            ->assertJsonPath('data.employee.full_name', $selected->full_name)
            ->assertJsonPath('data.check_in_address', 'Kantor pusat')
            ->assertJsonPath('data.check_in_face_score', '0.9800');
    }

    public function test_admin_attendance_period_uses_business_timezone_boundaries(): void
    {
        [$admin] = $this->employeeAccount(true);
        [, $employee] = $this->employeeAccount();
        $timezone = config('app.business_timezone', 'Asia/Jakarta');

        $firstLocalHour = AttendanceLog::create([
            'employee_id' => $employee->id,
            'check_in_at' => Carbon::parse('2026-09-01 00:30', $timezone)->utc(),
            'status' => 'on_time',
        ]);
        AttendanceLog::create([
            'employee_id' => $employee->id,
            'check_in_at' => Carbon::parse('2026-10-01 00:00', $timezone)->utc(),
            'status' => 'on_time',
        ]);

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/attendance?month=9&year=2026&per_page=500')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $firstLocalHour->id);
    }

    public function test_deleted_employee_email_can_be_used_for_a_new_account(): void
    {
        [$admin] = $this->employeeAccount(true);
        Sanctum::actingAs($admin);
        $email = 'dipakai.ulang@example.test';

        $firstId = $this->postJson('/api/admin/employees', [
            'email' => $email, 'password' => 'rahasia123',
        ])->assertCreated()->json('data.id');
        $this->deleteJson("/api/admin/employees/{$firstId}")->assertOk();
        $this->postJson('/api/admin/employees', [
            'email' => $email, 'password' => 'rahasia456',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => $email, 'deleted_at' => null]);
    }

    public function test_leave_balance_uses_admin_quota_and_rejects_excess_request(): void
    {
        [$user] = $this->employeeAccount();
        $type = LeaveType::create([
            'name' => 'Cuti Tahunan', 'code' => 'CTH', 'quota_per_year' => 1,
            'is_paid' => true, 'is_active' => true,
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/leave/balances')->assertOk()
            ->assertJsonPath('0.leave_type_id', $type->id)
            ->assertJsonPath('0.entitled_days', 1)
            ->assertJsonPath('0.remaining_days', 1);

        $this->postJson('/api/leave/request', [
            'leave_type_id' => $type->id,
            'start_date' => today()->addDay()->toDateString(),
            'end_date' => today()->addDays(2)->toDateString(),
            'reason' => 'Keperluan keluarga',
        ])->assertUnprocessable()->assertJsonValidationErrors('end_date');
    }

    public function test_admin_can_set_and_change_leave_quota(): void
    {
        [$admin] = $this->employeeAccount(true);
        Sanctum::actingAs($admin);

        $typeId = $this->postJson('/api/admin/leave-types', [
            'name' => 'Cuti Khusus', 'code' => 'CKH', 'quota_per_year' => 5,
            'is_paid' => true, 'is_active' => true, 'requires_attachment' => false,
        ])->assertCreated()->assertJsonPath('data.quota_per_year', 5)->json('data.id');

        $this->putJson("/api/admin/leave-types/{$typeId}", ['quota_per_year' => 7])
            ->assertOk()->assertJsonPath('data.quota_per_year', 7);
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
