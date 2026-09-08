<?php

namespace App\Http\Middleware;

use App\Models\Device;
use Closure;
use Illuminate\Http\Request;

class RequireActiveDevice
{
    public function handle(Request $request, Closure $next)
    {
        $employee = $request->user()?->employee;
        abort_unless($request->user()?->is_active && $employee, 403, 'Profil karyawan aktif diperlukan.');
        $request->validate(['device_id' => 'required|string|max:255']);

        abort_unless(
            Device::where('employee_id', $employee->id)
                ->where('device_fingerprint', $request->input('device_id'))
                ->active()
                ->exists(),
            403,
            'Perangkat belum disetujui atau telah dicabut oleh admin.'
        );

        return $next($request);
    }
}
