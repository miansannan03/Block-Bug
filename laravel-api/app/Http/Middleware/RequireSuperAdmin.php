<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        return $request->attributes->get('blockbug_platform_role') === 'SUPER_ADMIN'
            ? $next($request)
            : response()->json(['message' => 'Super Admin access is required.'], 403);
    }
}
