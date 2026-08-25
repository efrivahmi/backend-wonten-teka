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
        
        $month = $request->input('month', date('n'));
        $year = $request->input('year', date('Y'));
        
        $startDate = \Carbon\Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        
        $query = CalendarEvent::where('company_id', $user->company_id)
            ->whereBetween('start_date', [$startDate, $endDate]);
        
        if ($employee) {
            $query->where(function ($q) use ($employee) {
                $q->whereNull('department')
                  ->orWhere('department', $employee->department);
            });
        }
        
        $events = $query->orderBy('start_date', 'asc')->get();

        $attendanceLogs = [];
        if ($employee) {
            $attendanceLogs = \App\Models\AttendanceLog::where('employee_id', $employee->id)
                ->whereBetween('check_in_at', [$startDate, $endDate])
                ->get();
        }

        // Standard working days (Monday=1, Sunday=7)
        $workingDays = [1, 2, 3, 4, 5];
            
        return response()->json([
            'events' => $events,
            'attendance_logs' => $attendanceLogs,
            'working_days' => $workingDays,
        ]);
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

    /**
     * Get the current geofence settings for the company (Admin only).
     */
    public function getGeofence(Request $request)
    {
        if (!$request->user()->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $company = \App\Models\Company::find($request->user()->company_id);
        
        return response()->json([
            'latitude' => $company->latitude,
            'longitude' => $company->longitude,
            'geofence_radius_meters' => $company->geofence_radius_meters,
        ]);
    }

    /**
     * Update the geofence settings for the company (Admin only).
     */
    public function updateGeofence(Request $request)
    {
        if (!$request->user()->hasAnyRole(['super_admin', 'company_admin', 'hr_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'geofence_radius_meters' => 'required|numeric|min:10',
        ]);

        $company = \App\Models\Company::find($request->user()->company_id);
        $company->update([
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'geofence_radius_meters' => $request->geofence_radius_meters,
        ]);

        return response()->json([
            'message' => 'Geofence updated successfully', 
            'data' => [
                'latitude' => $company->latitude,
                'longitude' => $company->longitude,
                'geofence_radius_meters' => $company->geofence_radius_meters,
            ]
        ]);
    }

    /**
     * Create a new announcement (Admin only).
     */
    public function storeAnnouncement(Request $request)
    {
        $user = $request->user();
        
        if (!$user->hasAnyRole(['super_admin', 'company_admin', 'hr_admin', 'supervisor'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'priority' => 'required|in:low,normal,high,urgent',
            'target_type' => 'required|in:company,department,employee',
            'target_id' => 'nullable|string',
        ]);

        $announcement = Announcement::create([
            'company_id' => $user->company_id,
            'title' => $validated['title'],
            'content' => $validated['content'],
            'priority' => $validated['priority'],
            'target_type' => $validated['target_type'],
            'target_id' => $validated['target_id'] ?? null,
            'created_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Announcement created successfully',
            'data' => $announcement
        ], 201);
    }
}
