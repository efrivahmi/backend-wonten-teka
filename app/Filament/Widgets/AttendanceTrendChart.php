<?php

namespace App\Filament\Widgets;

use App\Models\AttendanceLog;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;

class AttendanceTrendChart extends ChartWidget
{
    protected ?string $heading = 'Attendance Trend (Last 7 Days)';
    
    protected static ?int $sort = 3;
    
    // Polling interval
    protected ?string $pollingInterval = '30s';

    protected function getData(): array
    {
        $data = [];
        $labels = [];

        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $labels[] = $date->format('M d');
            
            $count = AttendanceLog::whereDate('check_in_at', $date)
                ->count();
                
            $data[] = $count;
        }

        return [
            'datasets' => [
                [
                    'label' => 'Check-ins',
                    'data' => $data,
                    'borderColor' => '#10b981', // Emerald-500
                    'backgroundColor' => 'rgba(16, 185, 129, 0.2)',
                    'fill' => 'start',
                    'tension' => 0.4,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
