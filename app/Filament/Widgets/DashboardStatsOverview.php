<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\AttendanceLog;

class DashboardStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        // Simple dashboard stats
        return [
            Stat::make('Total Employees', Employee::count())
                ->description('Total active employees')
                ->descriptionIcon('heroicon-m-users')
                ->color('primary'),
                
            Stat::make('Pending Leaves', LeaveRequest::pending()->count())
                ->description('Awaiting approval')
                ->descriptionIcon('heroicon-m-clock')
                ->color('warning'),
                
            Stat::make('Today Attendance', AttendanceLog::today()->count())
                ->description('Checked in today')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success'),
        ];
    }
}
