<?php

namespace App\Filament\Widgets;

use App\Models\AttendanceLog;
use App\Models\Employee;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Carbon\Carbon;

class TodayAttendanceWidget extends BaseWidget
{
    protected static ?int $sort = 1;
    
    // Polling interval for realtime-ish feel
    protected ?string $pollingInterval = '10s';

    protected function getStats(): array
    {
        $today = Carbon::today();
        
        // In a multi-tenant setup, this should ideally be scoped by the currently authenticated user's company.
        // For simplicity, we fetch totals across the system or you could add ->where('company_id', auth()->user()->company_id)
        
        $totalEmployees = Employee::active()->count();
        
        $checkedInToday = AttendanceLog::where('type', 'check_in')
            ->whereDate('timestamp', $today)
            ->distinct('employee_id')
            ->count('employee_id');
            
        $missing = max(0, $totalEmployees - $checkedInToday);

        return [
            Stat::make('Total Employees', $totalEmployees)
                ->description('Active workforce')
                ->descriptionIcon('heroicon-m-user-group')
                ->color('primary'),
                
            Stat::make('Checked In Today', $checkedInToday)
                ->description('Employees currently present')
                ->descriptionIcon('heroicon-m-check-badge')
                ->color('success'),
                
            Stat::make('Missing / Late', $missing)
                ->description('Yet to check in')
                ->descriptionIcon('heroicon-m-clock')
                ->color('warning'),
        ];
    }
}
