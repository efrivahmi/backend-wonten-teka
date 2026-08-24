<?php

namespace Database\Seeders;

use App\Models\BpjsRate;
use App\Models\Pph21ProgressiveBracket;
use App\Models\Pph21TerRate;
use App\Models\PtkpThreshold;
use Illuminate\Database\Seeder;

class TaxRatesSeeder extends Seeder
{
    public function run(): void
    {
        $effectiveDate = '2024-01-01'; // Default effective date for current 2024/2026 rates

        // 1. PTKP Thresholds
        $ptkpRates = [
            ['status' => 'TK/0', 'annual_threshold' => 54000000],
            ['status' => 'TK/1', 'annual_threshold' => 58500000],
            ['status' => 'TK/2', 'annual_threshold' => 63000000],
            ['status' => 'TK/3', 'annual_threshold' => 67500000],
            ['status' => 'K/0', 'annual_threshold' => 58500000],
            ['status' => 'K/1', 'annual_threshold' => 63000000],
            ['status' => 'K/2', 'annual_threshold' => 67500000],
            ['status' => 'K/3', 'annual_threshold' => 72000000],
        ];

        foreach ($ptkpRates as $rate) {
            PtkpThreshold::updateOrCreate(
                ['status' => $rate['status'], 'effective_from' => $effectiveDate],
                ['annual_threshold' => $rate['annual_threshold']]
            );
        }

        // 2. BPJS & Tapera Rates
        $bpjsRates = [
            ['program' => 'kesehatan', 'employer_rate' => 0.04, 'employee_rate' => 0.01, 'salary_cap' => 12000000, 'jkk_risk_class' => null],
            ['program' => 'jht', 'employer_rate' => 0.037, 'employee_rate' => 0.02, 'salary_cap' => null, 'jkk_risk_class' => null],
            ['program' => 'jp', 'employer_rate' => 0.02, 'employee_rate' => 0.01, 'salary_cap' => 10042300, 'jkk_risk_class' => null], // Note: cap changes yearly, needs to be updated per 2026 BPJS release
            ['program' => 'jkm', 'employer_rate' => 0.003, 'employee_rate' => 0, 'salary_cap' => null, 'jkk_risk_class' => null],
            ['program' => 'jkp', 'employer_rate' => 0.0022, 'employee_rate' => 0, 'salary_cap' => null, 'jkk_risk_class' => null], // Portion of JKK/JKM usually
            ['program' => 'tapera', 'employer_rate' => 0.005, 'employee_rate' => 0.025, 'salary_cap' => null, 'jkk_risk_class' => null], // Mandated 2026/2027

            // JKK varies by risk
            ['program' => 'jkk', 'employer_rate' => 0.0024, 'employee_rate' => 0, 'salary_cap' => null, 'jkk_risk_class' => 'I'], // Very low risk
            ['program' => 'jkk', 'employer_rate' => 0.0054, 'employee_rate' => 0, 'salary_cap' => null, 'jkk_risk_class' => 'II'], // Low risk
            ['program' => 'jkk', 'employer_rate' => 0.0089, 'employee_rate' => 0, 'salary_cap' => null, 'jkk_risk_class' => 'III'], // Medium risk
            ['program' => 'jkk', 'employer_rate' => 0.0127, 'employee_rate' => 0, 'salary_cap' => null, 'jkk_risk_class' => 'IV'], // High risk
            ['program' => 'jkk', 'employer_rate' => 0.0174, 'employee_rate' => 0, 'salary_cap' => null, 'jkk_risk_class' => 'V'], // Very high risk
        ];

        foreach ($bpjsRates as $rate) {
            BpjsRate::updateOrCreate(
                [
                    'program' => $rate['program'],
                    'jkk_risk_class' => $rate['jkk_risk_class'],
                    'effective_from' => $effectiveDate
                ],
                [
                    'employer_rate' => $rate['employer_rate'],
                    'employee_rate' => $rate['employee_rate'],
                    'salary_cap' => $rate['salary_cap'],
                ]
            );
        }

        // 3. PPh 21 Progressive Brackets (Annual)
        $progressiveBrackets = [
            ['bracket_start' => 0, 'bracket_end' => 60000000, 'rate' => 0.05],
            ['bracket_start' => 60000000.01, 'bracket_end' => 250000000, 'rate' => 0.15],
            ['bracket_start' => 250000000.01, 'bracket_end' => 500000000, 'rate' => 0.25],
            ['bracket_start' => 500000000.01, 'bracket_end' => 5000000000, 'rate' => 0.30],
            ['bracket_start' => 5000000000.01, 'bracket_end' => null, 'rate' => 0.35],
        ];

        foreach ($progressiveBrackets as $bracket) {
            Pph21ProgressiveBracket::updateOrCreate(
                ['bracket_start' => $bracket['bracket_start'], 'effective_from' => $effectiveDate],
                ['bracket_end' => $bracket['bracket_end'], 'rate' => $bracket['rate']]
            );
        }

        // 4. PPh 21 TER Rates (Sample subset of Category A to demonstrate)
        // Note: Full TER tables have dozens of rows per category. We'll seed a few for demo purposes.
        $terRates = [
            // Category A (TK/0, TK/1, K/0)
            ['category' => 'A', 'income_range_start' => 0, 'income_range_end' => 5400000, 'rate' => 0.0000],
            ['category' => 'A', 'income_range_start' => 5400000.01, 'income_range_end' => 5650000, 'rate' => 0.0025],
            ['category' => 'A', 'income_range_start' => 5650000.01, 'income_range_end' => 5950000, 'rate' => 0.0050],
            ['category' => 'A', 'income_range_start' => 5950000.01, 'income_range_end' => 6300000, 'rate' => 0.0075],
            ['category' => 'A', 'income_range_start' => 6300000.01, 'income_range_end' => 6750000, 'rate' => 0.0100],
            // ... (requires full DJP table injection for production)
            
            // Category B (TK/2, TK/3, K/1, K/2)
            ['category' => 'B', 'income_range_start' => 0, 'income_range_end' => 6200000, 'rate' => 0.0000],
            ['category' => 'B', 'income_range_start' => 6200000.01, 'income_range_end' => 6500000, 'rate' => 0.0025],
            // ...

            // Category C (K/3)
            ['category' => 'C', 'income_range_start' => 0, 'income_range_end' => 6600000, 'rate' => 0.0000],
            ['category' => 'C', 'income_range_start' => 6600000.01, 'income_range_end' => 6950000, 'rate' => 0.0025],
            // ...
        ];

        foreach ($terRates as $rate) {
            Pph21TerRate::updateOrCreate(
                [
                    'category' => $rate['category'],
                    'income_range_start' => $rate['income_range_start'],
                    'effective_from' => $effectiveDate
                ],
                [
                    'income_range_end' => $rate['income_range_end'],
                    'effective_rate' => $rate['rate']
                ]
            );
        }
    }
}
