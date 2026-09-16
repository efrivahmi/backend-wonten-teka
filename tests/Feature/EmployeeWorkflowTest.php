<?php

namespace Tests\Feature;

use App\Models\ApprovalInstance;
use App\Models\Employee;
use App\Models\LeaveType;
use App\Models\ShiftTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_read_geofence_but_cannot_update_it(): void
    {
        [$user] = $this->employeeAccount();
        Sanctum::actingAs($user);

        $this->getJson('/api/company/geofence')->assertOk();
        $this->putJson('/api/company/geofence', [
            'latitude' => -6.2,
            'longitude' => 106.8,
            'geofence_radius_meters' => 100,
        ])->assertForbidden();
    }

    public function test_default_shift_is_listed_once_for_employee(): void
    {
        [$user] = $this->employeeAccount();
        Sanctum::actingAs($user);
        ShiftTemplate::create([
            'name' => 'Reguler',
            'category' => 'Reguler',
            'start_time' => '08:00',
            'end_time' => '17:00',
            'is_default' => true,
            'is_active' => true,
        ]);

        $this->getJson('/api/shifts/upcoming')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.is_default_schedule', true)
            ->assertJsonPath('data.0.shift_template.name', 'Reguler');
    }

    public function test_leave_request_waits_for_admin_approval(): void
    {
        [$user] = $this->employeeAccount();
        Sanctum::actingAs($user);
        $type = LeaveType::create([
            'name' => 'Cuti Bulanan',
            'code' => 'MONTHLY',
            'quota_per_month' => 3,
            'is_active' => true,
        ]);

        $this->postJson('/api/leave/request', [
            'leave_type_id' => $type->id,
            'start_date' => today()->addDay()->toDateString(),
            'end_date' => today()->addDays(2)->toDateString(),
            'reason' => 'Keperluan keluarga',
        ])->assertOk()->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('leave_requests', ['status' => 'pending']);
        $this->assertSame(1, ApprovalInstance::where('overall_status', 'pending')->count());
    }

    private function employeeAccount(): array
    {
        $user = User::factory()->create(['is_active' => true]);
        $employee = Employee::create([
            'user_id' => $user->id,
            'full_name' => $user->name,
            'email' => $user->email,
        ]);

        return [$user, $employee];
    }
}
