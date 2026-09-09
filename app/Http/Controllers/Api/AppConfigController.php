<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class AppConfigController extends Controller
{
    public function show()
    {
        $stored = Setting::where('key', 'app_config')->first()?->value ?? [];
        return response()->json(['data' => array_replace_recursive($this->defaults(), $stored)]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'branding' => 'sometimes|array',
            'branding.hero_image_url' => 'nullable|url',
            'branding.portal_name' => 'nullable|string|max:100',
            'employee_menu' => 'sometimes|array',
            'employee_menu.*.key' => 'required|string|max:50',
            'employee_menu.*.label' => 'required|string|max:80',
            'employee_menu.*.enabled' => 'required|boolean',
            'dropdowns' => 'sometimes|array',
            'dropdowns.*' => 'array',
            'dropdowns.*.*' => 'string|max:100',
        ]);

        $config = array_replace_recursive($this->defaults(), $data);
        Setting::updateOrCreate(['key' => 'app_config'], ['value' => $config]);

        return response()->json(['message' => 'Konfigurasi aplikasi disimpan.', 'data' => $config]);
    }

    private function defaults(): array
    {
        return [
            'branding' => ['portal_name' => 'Wonten Teka', 'hero_image_url' => null],
            'employee_menu' => [
                ['key' => 'attendance', 'label' => 'Riwayat Absensi', 'enabled' => true],
                ['key' => 'schedule', 'label' => 'Jadwal Shift Saya', 'enabled' => true],
                ['key' => 'leave', 'label' => 'Riwayat Cuti', 'enabled' => true],
                ['key' => 'overtime', 'label' => 'Lembur', 'enabled' => true],
                ['key' => 'claims', 'label' => 'Klaim / Reimburse', 'enabled' => true],
                ['key' => 'payroll', 'label' => 'Slip Gaji', 'enabled' => true],
                ['key' => 'calendar', 'label' => 'Kalender Perusahaan', 'enabled' => true],
                ['key' => 'announcements', 'label' => 'Pengumuman', 'enabled' => true],
                ['key' => 'tasks', 'label' => 'Tugas Pribadi', 'enabled' => true],
                ['key' => 'adjustments', 'label' => 'Koreksi Absensi', 'enabled' => true],
                ['key' => 'business_trips', 'label' => 'Perjalanan Dinas', 'enabled' => true],
                ['key' => 'directory', 'label' => 'Direktori Karyawan', 'enabled' => true],
                ['key' => 'notifications', 'label' => 'Notifikasi', 'enabled' => true],
                ['key' => 'biometric', 'label' => 'Pendaftaran Wajah', 'enabled' => true],
                ['key' => 'profile', 'label' => 'Profil', 'enabled' => true],
            ],
            'dropdowns' => [],
        ];
    }
}
