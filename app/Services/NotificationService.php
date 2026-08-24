<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Stub for sending push notifications via Firebase Cloud Messaging (FCM).
     */
    public function sendToEmployee($employeeId, $title, $body, $data = [])
    {
        // In a real implementation, you would:
        // 1. Fetch the employee's active device(s)
        // 2. Extract the FCM token(s)
        // 3. Send payload to FCM API
        
        Log::info("Push Notification sent to Employee {$employeeId}: {$title} - {$body}");
    }

    /**
     * Stub for sending push notifications to HR or Company Admins.
     */
    public function sendToHr($companyId, $title, $body, $data = [])
    {
        // In a real implementation, you would:
        // 1. Fetch all users in company_id with role 'hr_admin' or 'company_admin'
        // 2. Fetch their active devices & tokens
        // 3. Send payload to FCM API

        Log::info("Push Notification sent to HR of Company {$companyId}: {$title} - {$body}");
    }
}
