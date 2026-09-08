<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireAdmin
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless(
            $request->user()?->is_active && $request->user()->isAdmin(),
            403,
            'Akses administrator diperlukan.'
        );

        return $next($request);
    }
}
