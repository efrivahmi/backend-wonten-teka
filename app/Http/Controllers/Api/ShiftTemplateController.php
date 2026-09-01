<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShiftTemplate;
use Illuminate\Http\Request;

class ShiftTemplateController extends Controller
{
    /**
     * Get a list of all shift templates for the company.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $templates = ShiftTemplate::query()
            ->orderBy('start_time', 'asc')
            ->get();
            
        return response()->json(['data' => $templates]);
    }

    /**
     * Store a new shift template.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'grace_period_minutes' => 'nullable|integer|min:0',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        

        // If this is set to default, unset other defaults
        if (isset($validated['is_default']) && $validated['is_default']) {
            ShiftTemplate::update(['is_default' => false]);
        }

        $template = ShiftTemplate::create($validated);

        return response()->json([
            'message' => 'Shift template created successfully.',
            'data' => $template
        ], 201);
    }

    /**
     * Update an existing shift template.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $template = ShiftTemplate::where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'grace_period_minutes' => 'nullable|integer|min:0',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        // If this is set to default, unset other defaults
        if (isset($validated['is_default']) && $validated['is_default'] && !$template->is_default) {
            ShiftTemplate::update(['is_default' => false]);
        }

        $template->update($validated);

        return response()->json([
            'message' => 'Shift template updated successfully.',
            'data' => $template
        ]);
    }

    /**
     * Delete a shift template.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->hasAnyRole(['super_admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $template = ShiftTemplate::where('id', $id)->firstOrFail();
        
        // Cannot delete default shift if it's the only active one, but for simplicity let's just allow it
        $template->delete();

        return response()->json(['message' => 'Shift template deleted successfully.']);
    }
}
