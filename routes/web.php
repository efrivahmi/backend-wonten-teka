<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});
Route::get('/setup-database', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return 'Tabel database berhasil dibuat! Silakan kembali ke phpMyAdmin dan Import ulang file .sql Anda.';
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
});
// Web Frontend Route (React SPA)
Route::get('/web/{any?}', function () {
    return view('app');
})->where('any', '.*');
