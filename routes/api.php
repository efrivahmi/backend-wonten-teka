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
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\DeviceAdminController;
use App\Http\Controllers\Api\OvertimeController;
use App\Http\Controllers\Api\AttendanceAdjustmentController;
use App\Http\Controllers\Api\BusinessTripController;

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

    Route::post('/employee/complete-profile', [EmployeeController::class, 'completeProfile']);
    Route::get('/employee/options', [EmployeeController::class, 'getOptions']);

    Route::prefix('device')->group(function () {
        Route::post('/register', [DeviceController::class, 'register']);
        Route::get('/status', [DeviceController::class, 'status']);
    });

    Route::prefix('biometrics')->group(function () {
        Route::post('/enroll', [\App\Http\Controllers\Api\BiometricController::class, 'enroll']);
        Route::get('/sync', [\App\Http\Controllers\Api\BiometricController::class, 'sync']);
        // Web specific endpoint
        Route::post('/web/enroll', [\App\Http\Controllers\Api\WebBiometricController::class, 'enroll']);
    });

    // Personal Tasks
    Route::prefix('tasks')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\EmployeeTaskController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Api\EmployeeTaskController::class, 'store']);
        Route::put('/{id}', [\App\Http\Controllers\Api\EmployeeTaskController::class, 'update']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\EmployeeTaskController::class, 'destroy']);
    });

    Route::prefix('attendance')->group(function () {
        Route::get('/today-info', [AttendanceController::class, 'todayInfo']);
        Route::post('/enroll-face', [AttendanceController::class, 'enrollFace']);
        Route::post('/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('/check-out', [AttendanceController::class, 'checkOut']);
        Route::get('/history', [AttendanceController::class, 'history']);

        // New attendance form routes
        Route::post('/adjustment', [AttendanceAdjustmentController::class, 'store']);
        Route::get('/adjustment', [AttendanceAdjustmentController::class, 'index']);
        
        Route::post('/business-trip', [BusinessTripController::class, 'store']);
        Route::get('/business-trip', [BusinessTripController::class, 'index']);
    });

    Route::prefix('overtime')->group(function () {
        Route::post('/request', [OvertimeController::class, 'store']);
        Route::get('/history', [OvertimeController::class, 'index']);
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
        
        Route::get('/working-days', [CompanyController::class, 'getWorkingDays']);
        Route::put('/working-days', [CompanyController::class, 'updateWorkingDays']);
    });

    Route::prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'getStats']);
        
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{id}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
        Route::post('/announcements', [CompanyController::class, 'storeAnnouncement']);
        
        // Events
        Route::get('/events', [\App\Http\Controllers\Api\EventController::class, 'index']);
        Route::post('/events', [\App\Http\Controllers\Api\EventController::class, 'store']);
        Route::put('/events/{id}', [\App\Http\Controllers\Api\EventController::class, 'update']);
        Route::delete('/events/{id}', [\App\Http\Controllers\Api\EventController::class, 'destroy']);
        
        // Payroll
        Route::get('/payroll/runs', [\App\Http\Controllers\Api\PayrollController::class, 'index']);
        Route::post('/payroll/runs', [\App\Http\Controllers\Api\PayrollController::class, 'store']);
        Route::get('/payroll/runs/{id}', [\App\Http\Controllers\Api\PayrollController::class, 'show']);
        
        // Shifts
        Route::get('/shifts', [\App\Http\Controllers\Api\ShiftTemplateController::class, 'index']);
        Route::post('/shifts', [\App\Http\Controllers\Api\ShiftTemplateController::class, 'store']);
        Route::put('/shifts/{id}', [\App\Http\Controllers\Api\ShiftTemplateController::class, 'update']);
        Route::delete('/shifts/{id}', [\App\Http\Controllers\Api\ShiftTemplateController::class, 'destroy']);
        
        // Shift Assignments
        Route::get('/shift-assignments', [\App\Http\Controllers\Api\ShiftAssignmentController::class, 'index']);
        Route::post('/shift-assignments', [\App\Http\Controllers\Api\ShiftAssignmentController::class, 'store']);
        
        // Leave Types (Admin)
        Route::get('/leave-types', [\App\Http\Controllers\Api\AdminLeaveTypeController::class, 'index']);
        Route::post('/leave-types', [\App\Http\Controllers\Api\AdminLeaveTypeController::class, 'store']);
        Route::put('/leave-types/{id}', [\App\Http\Controllers\Api\AdminLeaveTypeController::class, 'update']);
        Route::delete('/leave-types/{id}', [\App\Http\Controllers\Api\AdminLeaveTypeController::class, 'destroy']);
        
        // Attendance Flags
        Route::get('/attendance', [\App\Http\Controllers\Api\AttendanceAdminController::class, 'index']);
        Route::get('/attendance-flags', [\App\Http\Controllers\Api\AttendanceAdminController::class, 'flags']);
        Route::post('/attendance-flags/{id}/resolve', [\App\Http\Controllers\Api\AttendanceAdminController::class, 'resolveFlag']);
        
        // Device Approvals
        Route::get('/devices/pending', [DeviceAdminController::class, 'getPendingDevices']);
        Route::post('/devices/{deviceId}/review', [DeviceAdminController::class, 'reviewDevice']);
    });
});
