<?php

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonInterface;

class ShiftTimeService
{
    public function now(): Carbon
    {
        return Carbon::now($this->timezone());
    }

    public function scheduledStart(
        string $startTime,
        CarbonInterface|string|null $workDate = null,
    ): Carbon {
        return $this->date($workDate)->setTimeFromTimeString($startTime);
    }

    public function scheduledEnd(
        string $startTime,
        string $endTime,
        CarbonInterface|string|null $workDate = null,
    ): Carbon {
        $start = $this->scheduledStart($startTime, $workDate);
        $end = $this->date($workDate)->setTimeFromTimeString($endTime);

        if ($end->lessThanOrEqualTo($start)) {
            $end->addDay();
        }

        return $end;
    }

    /** @return array{0: Carbon, 1: Carbon} UTC boundaries for a local workday. */
    public function utcDayBounds(CarbonInterface|string|null $workDate = null): array
    {
        $date = $this->date($workDate);

        return [
            $date->copy()->startOfDay()->utc(),
            $date->copy()->endOfDay()->utc(),
        ];
    }

    private function date(CarbonInterface|string|null $workDate): Carbon
    {
        if ($workDate instanceof CarbonInterface) {
            return Carbon::parse($workDate->toDateString(), $this->timezone());
        }

        return $workDate
            ? Carbon::parse($workDate, $this->timezone())->startOfDay()
            : $this->now()->startOfDay();
    }

    private function timezone(): string
    {
        return config('app.business_timezone', 'Asia/Jakarta');
    }
}
