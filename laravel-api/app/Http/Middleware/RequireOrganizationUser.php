<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireOrganizationUser
{
    public function handle(Request $request, Closure $next): Response
    {
        return $request->attributes->get('blockbug_actor_type') === 'user'
            ? $next($request)
            : response()->json(['message' => 'Organization membership is required.'], 403);
    }
}
