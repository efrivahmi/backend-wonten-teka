<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BpjsRate;
use App\Models\Pph21TerRate;
use App\Models\Setting;
use Illuminate\Http\Request;

class PayrollConfigurationController extends Controller
{
    public function show()
    {
        return response()->json([
            'data' => [
                'settings' => Setting::where('key', 'payroll_config')->first()?->value ?? [
                    'attendance_period_start' => 21,
                    'attendance_period_end' => 20,
                    'payment_day' => 25,
                ],
                'bpjs_rates' => BpjsRate::orderBy('program')->orderByDesc('effective_from')->get(),
                'pph21_ter_rates' => Pph21TerRate::orderBy('category')->orderBy('income_range_start')->get(),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.attendance_period_start' => 'required|integer|min:1|max:31',
            'settings.attendance_period_end' => 'required|integer|min:1|max:31',
            'settings.payment_day' => 'required|integer|min:1|max:31',
        ]);

        Setting::updateOrCreate(['key' => 'payroll_config'], ['value' => $data['settings']]);
        return $this->show();
    }
}
