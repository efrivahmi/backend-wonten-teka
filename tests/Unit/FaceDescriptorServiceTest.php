<?php

namespace Tests\Unit;

use App\Services\FaceDescriptorService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class FaceDescriptorServiceTest extends TestCase
{
    public function test_it_accepts_a_matching_web_descriptor(): void
    {
        $descriptor = array_fill(0, 128, 0.1);

        $score = (new FaceDescriptorService)->verifyWebDescriptor($descriptor, [$descriptor]);

        $this->assertSame(1.0, $score);
    }

    public function test_it_rejects_a_non_matching_web_descriptor(): void
    {
        $this->expectException(ValidationException::class);

        (new FaceDescriptorService)->verifyWebDescriptor(
            array_fill(0, 128, 0.0),
            [array_fill(0, 128, 1.0)]
        );
    }
}
