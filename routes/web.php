<?php

use Illuminate\Support\Facades\Route;

Route::get('/setup-database', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return 'Tabel database berhasil dibuat! Silakan kembali ke phpMyAdmin dan Import ulang file .sql Anda.';
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
});

Route::get('/clean-duplicates', function () {
    $logs = \App\Models\AttendanceLog::all();
    $seen = [];
    $deleted = 0;
    foreach ($logs as $log) {
        if ($log->status === 'absent' && isset($log->flags['auto_absent'])) {
            $tempId = $log->flags['shift_template_id'] ?? null;
            $date = \Carbon\Carbon::parse($log->check_in_at)->toDateString();
            $key = $log->employee_id . '-' . $date . '-' . $tempId;
            if (isset($seen[$key])) {
                $log->delete();
                $deleted++;
            } else {
                $seen[$key] = true;
            }
        }
    }
    return "Berhasil menghapus {$deleted} data absensi ganda.";
});

// Fallback to React SPA for all other web routes
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api|filament).*$'); // Prevent overriding /api and /filament (if filament is kept as fallback)
