<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateBlockBug
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = $request->bearerToken();
        if (! $plain) {
            return response()->json(['message' => 'Authentication is required.'], 401);
        }

        $token = DB::table('access_tokens')
            ->where('token_hash', hash('sha256', $plain))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();
        if (! $token) {
            return response()->json(['message' => 'Your session is invalid or has expired.'], 401);
        }

        if ($token->actor_type === 'platform_admin') {
            $actor = DB::table('platform_admins')->where('id', $token->actor_id)->where('status', 'active')->first();
            if (! $actor) {
                return response()->json(['message' => 'This account is inactive.'], 403);
            }
            $request->attributes->set('blockbug_actor', $actor);
            $request->attributes->set('blockbug_actor_type', 'platform_admin');
            $request->attributes->set('blockbug_platform_role', 'SUPER_ADMIN');
        } else {
            $actor = DB::table('users')->where('id', $token->actor_id)->where('status', 'active')->first();
            if (! $actor) {
                return response()->json(['message' => 'This account is inactive.'], 403);
            }
            $organization = DB::table('organizations')->where('id', $actor->org_id)->whereNull('deleted_at')->first();
            if (! $organization || $organization->status !== 'active') {
                return response()->json(['message' => 'Your organization is suspended. Contact the BlockBug platform administrator.'], 403);
            }
            $request->attributes->set('blockbug_actor', $actor);
            $request->attributes->set('blockbug_actor_type', 'user');
            $request->attributes->set('blockbug_organization', $organization);
            $request->attributes->set('blockbug_organization_id', $actor->org_id);
            $request->attributes->set('blockbug_organization_role', $actor->role);
            DB::table('organizations')->where('id', $actor->org_id)->update(['last_activity_at' => now()]);
        }

        DB::table('access_tokens')->where('id', $token->id)->update(['last_used_at' => now()]);

        return $next($request);
    }
}
