<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\Company;
use App\Models\User;
use App\Models\Employee;
use App\Models\ShiftTemplate;
use App\Models\ShiftAssignment;
use App\Models\AttendanceLog;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\ClaimCategory;
use App\Models\Claim;
use Carbon\Carbon;
use Faker\Factory as Faker;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('id_ID');

        // 1. Create Company
        $company = Company::firstOrCreate(
            ['email' => 'contact@wontenteka.com'],
            [
                'name' => 'Wonten Teka HQ',
                'slug' => 'wonten-teka-hq',
                'phone' => '021-555-0000',
                'address' => 'Jl. Jendral Sudirman No. 1, Jakarta',
                'latitude' => -6.225014,
                'longitude' => 106.804192,
                'geofence_radius_meters' => 100,
                'is_active' => true,
            ]
        );

        $departments = collect(['Engineering', 'Human Resources', 'Marketing', 'Sales', 'Finance']);

        // 3. Create Leave Types & Claim Categories
        $leaveType = LeaveType::firstOrCreate(['company_id' => $company->id, 'name' => 'Cuti Tahunan'], ['quota_per_year' => 12, 'is_paid' => true, 'code' => 'CT']);
        $sickLeave = LeaveType::firstOrCreate(['company_id' => $company->id, 'name' => 'Sakit'], ['quota_per_year' => 5, 'is_paid' => true, 'code' => 'SK']);
        
        $claimCatTravel = ClaimCategory::firstOrCreate(['company_id' => $company->id, 'name' => 'Transportasi'], ['is_active' => true]);
        $claimCatFood = ClaimCategory::firstOrCreate(['company_id' => $company->id, 'name' => 'Makan & Konsumsi'], ['is_active' => true]);

        // 4. Create Shift Templates
        $shiftMorning = ShiftTemplate::firstOrCreate(
            ['company_id' => $company->id, 'name' => 'Morning Shift'],
            ['start_time' => '08:00', 'end_time' => '17:00']
        );
        $shiftNight = ShiftTemplate::firstOrCreate(
            ['company_id' => $company->id, 'name' => 'Night Shift'],
            ['start_time' => '20:00', 'end_time' => '05:00']
        );

        // 5. Generate 20 Dummy Employees
        for ($i = 1; $i <= 20; $i++) {
            $user = User::firstOrCreate(
                ['email' => "employee$i@example.com"],
                [
                    'name' => $faker->name,
                    'password' => Hash::make('password'),
                    'is_active' => true,
                ]
            );
            $user->assignRole('employee');

            $employee = Employee::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'company_id' => $company->id,
                    'department' => $departments->random(),
                    'full_name' => $user->name,
                    'employee_number' => 'EMP' . str_pad($i, 4, '0', STR_PAD_LEFT),
                    'position' => $faker->jobTitle,
                    'join_date' => $faker->dateTimeBetween('-3 years', '-1 month'),
                    'is_active' => true,
                ]
            );

            // Give them Leave Balances
            LeaveBalance::firstOrCreate(
                ['employee_id' => $employee->id, 'leave_type_id' => $leaveType->id, 'year' => Carbon::now()->year],
                ['company_id' => $company->id, 'entitled_days' => 12, 'used_days' => 0, 'remaining_days' => 12]
            );

            // Create some past shifts and attendance logs for the last 7 days
            for ($d = 7; $d >= 0; $d--) {
                $date = Carbon::now()->subDays($d);
                if ($date->isWeekend()) continue;

                $shift = $d % 2 == 0 ? $shiftMorning : $shiftNight;

                $assignment = ShiftAssignment::create([
                    'company_id' => $company->id,
                    'employee_id' => $employee->id,
                    'shift_template_id' => $shift->id,
                    'date' => $date->toDateString(),
                ]);

                // Simulate attendance (90% chance they showed up)
                if ($faker->boolean(90)) {
                    // Check-in around 08:00 or 20:00
                    $checkInTime = (clone $date)->setTimeFromTimeString($shift->start_time)->addMinutes($faker->numberBetween(-15, 30));
                    $checkOutTime = (clone $date)->setTimeFromTimeString($shift->end_time)->addMinutes($faker->numberBetween(0, 60));

                    AttendanceLog::create([
                        'employee_id' => $employee->id,
                        'company_id' => $company->id,
                        'shift_assignment_id' => $assignment->id,
                        'check_in_at' => $checkInTime,
                        'check_in_latitude' => $company->latitude + $faker->randomFloat(6, -0.0001, 0.0001),
                        'check_in_longitude' => $company->longitude + $faker->randomFloat(6, -0.0001, 0.0001),
                        'check_in_face_score' => $faker->randomFloat(2, 0.85, 0.99),
                        'check_out_at' => $checkOutTime,
                        'check_out_latitude' => $company->latitude + $faker->randomFloat(6, -0.0001, 0.0001),
                        'check_out_longitude' => $company->longitude + $faker->randomFloat(6, -0.0001, 0.0001),
                        'check_out_face_score' => $faker->randomFloat(2, 0.85, 0.99),
                        'status' => $checkInTime->format('H:i') > (clone $date)->setTimeFromTimeString($shift->start_time)->addMinutes(15)->format('H:i') ? 'late' : 'present',
                        'work_duration_minutes' => $checkInTime->diffInMinutes($checkOutTime),
                    ]);
                }
            }

            // Random Leave Request
            if ($faker->boolean(30)) {
                $startDate = Carbon::now()->addDays($faker->numberBetween(1, 14));
                $endDate = (clone $startDate)->addDays($faker->numberBetween(1, 3));
                LeaveRequest::create([
                    'employee_id' => $employee->id,
                    'company_id' => $company->id,
                    'leave_type_id' => $leaveType->id,
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                    'total_days' => $startDate->diffInDays($endDate) + 1,
                    'reason' => 'Liburan keluarga',
                    'status' => $faker->randomElement(['pending', 'approved', 'rejected']),
                ]);
            }

            // Random Claim
            if ($faker->boolean(40)) {
                Claim::create([
                    'employee_id' => $employee->id,
                    'company_id' => $company->id,
                    'claim_category_id' => $faker->randomElement([$claimCatFood->id, $claimCatTravel->id]),
                    'amount' => $faker->numberBetween(5, 50) * 10000,
                    'description' => 'Meeting dengan client',
                    'expense_date' => Carbon::now()->subDays($faker->numberBetween(1, 10))->toDateString(),
                    'status' => $faker->randomElement(['pending', 'approved']),
                ]);
            }
        }
    }
}
