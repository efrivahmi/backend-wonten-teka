<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BpjsRate;
use App\Models\Pph21TerRate;
use App\Models\Setting;
use App\Models\PayrollComponent;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class PayrollConfigurationController extends Controller
{
    public function show()
    {
        $defaults = [
            'attendance_period_start' => 21,
            'attendance_period_end' => 20,
            'payment_day' => 25,
            'attendance_deduction_enabled' => false,
            'attendance_deduction_per_day' => 0,
            'pph21_enabled' => false,
            'bpjs_enabled' => false,
            'jkk_risk_class' => 'I',
            'job_expense_rate' => 0.05,
            'job_expense_monthly_cap' => 500000,
        ];
        $settings = array_merge($defaults, Setting::where('key', 'payroll_config')->first()?->value ?? []);
        return response()->json([
            'data' => [
                'settings' => $settings,
                'bpjs_rates' => BpjsRate::orderBy('program')->orderByDesc('effective_from')->get(),
                'pph21_ter_rates' => Pph21TerRate::orderBy('category')->orderBy('income_range_start')->get(),
                'components' => PayrollComponent::orderBy('sort_order')->orderBy('name')->get(),
                'pph21_progressive_brackets' => DB::table('pph21_progressive_brackets')->orderBy('bracket_start')->get(),
                'ptkp_thresholds' => DB::table('ptkp_thresholds')->orderBy('status')->get(),
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
            'settings.attendance_deduction_enabled' => 'required|boolean',
            'settings.attendance_deduction_per_day' => 'required|numeric|min:0|max:999999999',
            'settings.pph21_enabled' => 'required|boolean',
            'settings.bpjs_enabled' => 'required|boolean',
            'settings.jkk_risk_class' => ['required', Rule::in(['I', 'II', 'III', 'IV', 'V'])],
            'settings.job_expense_rate' => 'required|numeric|min:0|max:1',
            'settings.job_expense_monthly_cap' => 'required|numeric|min:0|max:999999999',
        ]);

        Setting::updateOrCreate(['key' => 'payroll_config'], ['value' => $data['settings']]);
        return $this->show();
    }

    public function storeComponent(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120', 'code' => 'nullable|string|max:40',
            'type' => ['required', Rule::in(['earning', 'deduction'])], 'is_taxable' => 'required|boolean',
            'default_amount' => 'required|numeric|min:0', 'is_active' => 'required|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        if (strtolower((string) ($validated['code'] ?? '')) === 'base') {
            if ($validated['type'] !== 'earning' || PayrollComponent::whereRaw('LOWER(code) = ?', ['base'])->exists()) {
                return response()->json(['message' => 'Komponen BASE hanya boleh satu dan harus bertipe penghasilan.'], 422);
            }
        }
        $validated['applies_to'] = 'all';
        return response()->json(['data' => PayrollComponent::create($validated)], 201);
    }

    public function updateComponent(Request $request, PayrollComponent $component)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120', 'code' => 'nullable|string|max:40',
            'type' => ['required', Rule::in(['earning', 'deduction'])], 'is_taxable' => 'required|boolean',
            'default_amount' => 'required|numeric|min:0', 'is_active' => 'required|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        $newCode = $validated['code'] ?? $component->code;
        if (strtolower((string) $component->code) === 'base' && strtolower((string) $newCode) !== 'base') {
            return response()->json(['message' => 'Kode komponen gaji pokok BASE tidak dapat diubah.'], 422);
        }
        if (strtolower((string) $newCode) === 'base' && $validated['type'] !== 'earning') {
            return response()->json(['message' => 'Komponen BASE harus bertipe penghasilan.'], 422);
        }
        if (strtolower((string) $newCode) === 'base' && strtolower((string) $component->code) !== 'base' && PayrollComponent::whereRaw('LOWER(code) = ?', ['base'])->exists()) {
            return response()->json(['message' => 'Komponen BASE sudah tersedia.'], 422);
        }
        $component->update([...$validated, 'code' => $newCode, 'applies_to' => 'all']);
        return response()->json(['data' => $component->fresh()]);
    }

    public function destroyComponent(PayrollComponent $component)
    {
        if (strtolower((string) $component->code) === 'base') {
            return response()->json(['message' => 'Komponen gaji pokok BASE tidak dapat dihapus.'], 422);
        }
        $component->delete();
        return response()->json(['message' => 'Komponen dihapus.']);
    }

    public function saveBpjsRates(Request $request)
    {
        $validated = $request->validate([
            'rates' => 'required|array|min:1',
            'rates.*.id' => 'nullable|integer|exists:bpjs_rates,id',
            'rates.*.program' => ['required', Rule::in(['kesehatan', 'jht', 'jp', 'jkk', 'jkm'])],
            'rates.*.employer_rate' => 'required|numeric|min:0|max:1',
            'rates.*.employee_rate' => 'required|numeric|min:0|max:1',
            'rates.*.salary_cap' => 'nullable|numeric|min:0',
            'rates.*.jkk_risk_class' => 'nullable|in:I,II,III,IV,V',
            'rates.*.effective_from' => 'required|date', 'rates.*.effective_to' => 'nullable|date|after_or_equal:rates.*.effective_from',
            'rates.*.notes' => 'nullable|string|max:1000',
        ]);
        foreach ($validated['rates'] as $rate) {
            $id = $rate['id'] ?? null;
            unset($rate['id']);
            BpjsRate::updateOrCreate(['id' => $id], $rate);
        }
        return $this->show();
    }

    public function saveTerRates(Request $request)
    {
        $validated = $request->validate([
            'rates' => 'required|array|min:1',
            'rates.*.id' => 'nullable|integer|exists:pph21_ter_rates,id',
            'rates.*.category' => ['required', Rule::in(['A', 'B', 'C'])],
            'rates.*.income_range_start' => 'required|numeric|min:0',
            'rates.*.income_range_end' => 'nullable|numeric|gte:rates.*.income_range_start',
            'rates.*.effective_rate' => 'required|numeric|min:0|max:1',
            'rates.*.effective_from' => 'required|date', 'rates.*.effective_to' => 'nullable|date',
        ]);
        foreach ($validated['rates'] as $rate) {
            $id = $rate['id'] ?? null;
            unset($rate['id']);
            Pph21TerRate::updateOrCreate(['id' => $id], $rate);
        }
        return $this->show();
    }

    public function saveAnnualTaxRates(Request $request)
    {
        $validated = $request->validate([
            'brackets' => 'required|array|min:1',
            'brackets.*.id' => 'nullable|integer|exists:pph21_progressive_brackets,id',
            'brackets.*.bracket_start' => 'required|numeric|min:0',
            'brackets.*.bracket_end' => 'nullable|numeric|gte:brackets.*.bracket_start',
            'brackets.*.rate' => 'required|numeric|min:0|max:1',
            'brackets.*.effective_from' => 'required|date', 'brackets.*.effective_to' => 'nullable|date',
            'ptkp' => 'required|array|min:1',
            'ptkp.*.id' => 'nullable|integer|exists:ptkp_thresholds,id',
            'ptkp.*.status' => 'required|string|max:12', 'ptkp.*.annual_threshold' => 'required|numeric|min:0',
            'ptkp.*.effective_from' => 'required|date', 'ptkp.*.effective_to' => 'nullable|date',
        ]);
        foreach ($validated['brackets'] as $row) {
            $id = $row['id'] ?? null; unset($row['id']);
            $id ? DB::table('pph21_progressive_brackets')->where('id', $id)->update([...$row, 'updated_at' => now()]) : DB::table('pph21_progressive_brackets')->insert([...$row, 'created_at' => now(), 'updated_at' => now()]);
        }
        foreach ($validated['ptkp'] as $row) {
            $id = $row['id'] ?? null; unset($row['id']);
            $id ? DB::table('ptkp_thresholds')->where('id', $id)->update([...$row, 'updated_at' => now()]) : DB::table('ptkp_thresholds')->insert([...$row, 'created_at' => now(), 'updated_at' => now()]);
        }
        return $this->show();
    }
}
