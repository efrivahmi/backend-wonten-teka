<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('employees')
            ->select(['id', 'user_id', 'employee_number', 'created_at'])
            ->orderBy('id')
            ->chunkById(100, function ($employees) {
                foreach ($employees as $employee) {
                    if (!preg_match('/^\d{19,}$|^EMP-\d{6}-\d{5}(?:-\d+)?$/', (string) $employee->employee_number)) {
                        continue;
                    }

                    $date = $employee->created_at ? Carbon::parse($employee->created_at) : now();
                    $identity = $employee->user_id ?: $employee->id;
                    $isAdmin = $employee->user_id && DB::table('model_has_roles')
                        ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                        ->where('model_has_roles.model_type', 'App\\Models\\User')
                        ->where('model_has_roles.model_id', $employee->user_id)
                        ->where('roles.name', 'admin')
                        ->exists();
                    $prefix = $isAdmin ? 'ADM' : 'EMP';
                    $base = $prefix . '-' . $date->format('Y') . '-' . str_pad((string) $identity, 4, '0', STR_PAD_LEFT);
                    $candidate = $base;
                    $suffix = 1;

                    while (DB::table('employees')->where('employee_number', $candidate)->exists()) {
                        $candidate = $base . '-' . $suffix++;
                    }

                    DB::table('employees')->where('id', $employee->id)->update([
                        'employee_number' => $candidate,
                        'updated_at' => now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Nilai identitas lama yang tidak valid sengaja tidak dipulihkan.
    }
};
