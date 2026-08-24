<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\CalendarEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompanyController extends Controller
{
    /**
     * Get company calendar events (e.g. holidays, meetings).
     */
    public function calendar(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;
        
        $query = CalendarEvent::where('company_id', $user->company_id);
        
        if ($employee) {
            $query->where(function ($q) use ($employee) {
                $q->whereNull('department')
                  ->orWhere('department', $employee->department);
            });
        }
        
        // Return events from today onwards
        $events = $query->whereDate('start_date', '>=', today())
            ->orderBy('start_date', 'asc')
            ->paginate(15);
            
        return response()->json($events);
    }

    /**
     * Get urgent announcements for the employee.
     */
    public function announcements(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;
        
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 403);
        }

        $announcements = Announcement::where('company_id', $user->company_id)
            ->where(function ($query) use ($employee) {
                $query->where('target_type', 'company')
                      ->orWhere(function ($q) use ($employee) {
                          $q->where('target_type', 'department')
                            ->where('target_id', $employee->department);
                      })
                      ->orWhere(function ($q) use ($employee) {
                          $q->where('target_type', 'employee')
                            ->where('target_id', $employee->id);
                      });
            })
            // Left join to see if the current employee has acknowledged it
            ->with(['acknowledgments' => function ($query) use ($employee) {
                $query->where('employee_id', $employee->id);
            }])
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($announcements);
    }

    /**
     * Mark an announcement as acknowledged by the employee.
     */
    public function acknowledgeAnnouncement(Request $request, Announcement $announcement)
    {
        $user = $request->user();
        $employee = $user->employee;

        if ($announcement->company_id !== $user->company_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Use DB directly or create the Acknowledgement model explicitly
        DB::table('announcement_acknowledgments')->updateOrInsert(
            [
                'announcement_id' => $announcement->id,
                'employee_id' => $employee->id,
            ],
            [
                'acknowledged_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        return response()->json(['message' => 'Announcement acknowledged.']);
    }
}
