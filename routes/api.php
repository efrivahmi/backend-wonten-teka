<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\ClaimController;
use App\Http\Controllers\Api\PayslipController;
use App\Http\Controllers\Api\PersonalTaskController;

// Simple root API route for sanity check
Route::get('/', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Wonten Teka API is running and ready for connections!',
        'version' => '1.0.0',
        'timestamp' => now()->toIso8601String(),
    ]);
});
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::prefix('device')->group(function () {
        Route::post('/register', [DeviceController::class, 'register']);
        Route::get('/status', [DeviceController::class, 'status']);
    });

    Route::prefix('attendance')->group(function () {
        Route::post('/enroll-face', [AttendanceController::class, 'enrollFace']);
        Route::post('/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('/check-out', [AttendanceController::class, 'checkOut']);
        Route::get('/history', [AttendanceController::class, 'history']);
    });

    Route::prefix('leave')->group(function () {
        Route::get('/types', [LeaveController::class, 'types']);
        Route::get('/balances', [LeaveController::class, 'balances']);
        Route::get('/history', [LeaveController::class, 'history']);
        Route::post('/request', [LeaveController::class, 'request']);
    });

    Route::prefix('approvals')->group(function () {
        Route::get('/pending', [ApprovalController::class, 'pending']);
        Route::post('/{instance}/action', [ApprovalController::class, 'action']);
    });

    Route::prefix('claims')->group(function () {
        Route::get('/categories', [ClaimController::class, 'categories']);
        Route::get('/history', [ClaimController::class, 'history']);
        Route::post('/submit', [ClaimController::class, 'submit']);
    });

    Route::prefix('payslips')->group(function () {
        Route::get('/', [PayslipController::class, 'history']);
        Route::get('/{payslip}', [PayslipController::class, 'show']);
        Route::get('/{payslip}/download', [PayslipController::class, 'download']);
    });

    Route::prefix('tasks')->group(function () {
        Route::get('/', [PersonalTaskController::class, 'index']);
        Route::post('/', [PersonalTaskController::class, 'store']);
        Route::post('/{task}/complete', [PersonalTaskController::class, 'complete']);
    });

    Route::get('/shifts/upcoming', [ShiftController::class, 'upcoming']);
    Route::get('/calendar', [CompanyController::class, 'calendar']);
    
    Route::prefix('announcements')->group(function () {
        Route::get('/', [CompanyController::class, 'announcements']);
        Route::post('/{announcement}/acknowledge', [CompanyController::class, 'acknowledgeAnnouncement']);
    });
    
    Route::prefix('company')->group(function () {
        Route::get('/geofence', [CompanyController::class, 'getGeofence']);
        Route::put('/geofence', [CompanyController::class, 'updateGeofence']);
    });
});