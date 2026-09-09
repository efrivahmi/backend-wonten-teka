<?php

namespace Tests\Unit;

use App\Services\ShiftTimeService;
use Carbon\Carbon;
use Tests\TestCase;

class ShiftTimeServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_checkout_time_is_compared_in_business_timezone(): void
    {
        config(['app.business_timezone' => 'Asia/Jakarta']);
        Carbon::setTestNow(Carbon::parse('2026-09-10 12:01:00', 'UTC'));

        $clock = new ShiftTimeService();
        $end = $clock->scheduledEnd('08:00', '19:00', '2026-09-10');

        $this->assertSame('19:01', $clock->now()->format('H:i'));
        $this->assertTrue($clock->now()->greaterThanOrEqualTo($end));
    }

    public function test_overnight_shift_ends_on_the_following_day(): void
    {
        config(['app.business_timezone' => 'Asia/Jakarta']);

        $end = (new ShiftTimeService())
            ->scheduledEnd('20:00', '05:00', '2026-09-10');

        $this->assertSame('2026-09-11 05:00', $end->format('Y-m-d H:i'));
    }
}
