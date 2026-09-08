<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class FaceDescriptorService
{
    public const WEB_DISTANCE_THRESHOLD = 0.45;

    public function normalize(mixed $value): array
    {
        for ($i = 0; $i < 2 && is_string($value); $i++) {
            $value = json_decode($value, true);
        }

        return is_array($value) ? $value : [];
    }

    public function verifyWebDescriptor(array $live, array $references): float
    {
        $bestDistance = INF;
        foreach ($references as $reference) {
            if (!is_array($reference) || count($reference) !== 128 || count($live) !== 128) {
                continue;
            }
            $sum = 0.0;
            foreach ($reference as $index => $value) {
                if (!is_numeric($value) || !is_numeric($live[$index])) {
                    continue 2;
                }
                $sum += ((float) $value - (float) $live[$index]) ** 2;
            }
            $bestDistance = min($bestDistance, sqrt($sum));
        }

        if ($bestDistance >= self::WEB_DISTANCE_THRESHOLD) {
            throw ValidationException::withMessages([
                'face_descriptor' => 'Wajah tidak cocok. Coba lagi dengan pencahayaan merata.',
            ]);
        }

        return max(0.0, 1.0 - $bestDistance);
    }
}
