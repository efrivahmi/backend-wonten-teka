<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeviceBindingTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_device_registration_waits_for_admin_approval(): void
    {
        [$user, $employee] = $this->employeeAccount('Employee One');
        Sanctum::actingAs($user);

        $this->postJson('/api/device/register', [
            'device_fingerprint' => 'phone-001',
            'device_name' => 'Android Phone',
            'os_version' => 'Android 16',
        ])->assertCreated()
            ->assertJsonPath('device.employee_id', $employee->id)
            ->assertJsonPath('device.status', 'pending_approval');

        $this->assertDatabaseHas('devices', [
            'employee_id' => $employee->id,
            'device_fingerprint' => 'phone-001',
            'status' => 'pending_approval',
        ]);
    }

    public function test_same_physical_device_has_separate_binding_for_each_account(): void
    {
        [$firstUser, $firstEmployee] = $this->employeeAccount('Employee One');
        [$secondUser, $secondEmployee] = $this->employeeAccount('Employee Two');

        Device::create([
            'employee_id' => $firstEmployee->id,
            'device_fingerprint' => 'shared-phone',
            'device_name' => 'Shared Phone',
            'status' => 'active',
        ]);

        Sanctum::actingAs($secondUser);
        $this->postJson('/api/device/register', [
            'device_fingerprint' => 'shared-phone',
            'device_name' => 'Shared Phone',
        ])->assertCreated()->assertJsonPath('device.status', 'pending_approval');

        $this->assertDatabaseHas('devices', [
            'employee_id' => $secondEmployee->id,
            'device_fingerprint' => 'shared-phone',
            'status' => 'pending_approval',
        ]);
        $this->assertSame(2, Device::where('device_fingerprint', 'shared-phone')->count());
    }

    public function test_admin_approval_records_the_reviewer_and_unlocks_status(): void
    {
        [, $employee] = $this->employeeAccount('Employee One');
        $admin = User::factory()->create(['is_super_admin' => true, 'is_active' => true]);
        $device = Device::create([
            'employee_id' => $employee->id,
            'device_fingerprint' => 'phone-approval',
            'device_name' => 'Approval Phone',
            'status' => 'pending_approval',
        ]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/devices/{$device->id}/review", [
            'action' => 'approve',
        ])->assertOk()->assertJsonPath('device.status', 'active');

        $device->refresh();
        $this->assertSame($admin->id, $device->approved_by);
        $this->assertNotNull($device->approved_at);
    }

    private function employeeAccount(string $name): array
    {
        $user = User::factory()->create(['name' => $name, 'is_active' => true]);
        $employee = Employee::create([
            'user_id' => $user->id,
            'full_name' => $name,
            'email' => $user->email,
        ]);

        return [$user, $employee];
    }
}
