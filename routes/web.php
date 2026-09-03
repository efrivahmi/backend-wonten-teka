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

// Fallback to React SPA for all other web routes
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api|filament).*$'); // Prevent overriding /api and /filament (if filament is kept as fallback)
