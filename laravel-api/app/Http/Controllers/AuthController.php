<?php

namespace App\Http\Controllers;

use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email|max:180', 'password' => 'required|string']);
        $email = Str::lower(trim($data['email']));

        $admin = DB::table('platform_admins')->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($admin) {
            if ($admin->status !== 'active' || ! Hash::check($data['password'], $admin->password_hash)) {
                AuditLogger::write($request, 'LOGIN_FAILED', 'platform_admin', $admin->id, ['email' => $email], false, null, $admin, 'platform_admin', 'SUPER_ADMIN');

                return response()->json(['message' => 'Invalid email or password.'], 401);
            }
            [$plain, $expiresAt] = $this->issueToken('platform_admin', $admin->id);
            AuditLogger::write($request, 'LOGIN_SUCCESS', 'platform_admin', $admin->id, [], true, null, $admin, 'platform_admin', 'SUPER_ADMIN');

            return response()->json([
                'token' => $plain,
                'expiresAt' => $expiresAt,
                'user' => $this->platformAdminPayload($admin),
            ]);
        }

        $matches = DB::table('users')->whereRaw('LOWER(email) = ?', [$email])->get();
        if ($matches->count() > 1) {
            AuditLogger::write($request, 'LOGIN_FAILED', 'user', null, ['email' => $email, 'reason' => 'ambiguous_legacy_email'], false);

            return response()->json(['message' => 'This email belongs to multiple legacy workspaces. Ask the platform administrator to resolve the duplicate memberships.'], 409);
        }
        $user = $matches->first();
        if (! $user || $user->status !== 'active' || ! Hash::check($data['password'], $user->password_hash)) {
            AuditLogger::write($request, 'LOGIN_FAILED', 'user', $user->id ?? null, ['email' => $email], false, $user->org_id ?? null, $user, 'user', $user->role ?? null);

            return response()->json(['message' => 'Invalid email or password.'], 401);
        }
        $organization = DB::table('organizations')->where('id', $user->org_id)->whereNull('deleted_at')->first();
        if (! $organization || $organization->status !== 'active') {
            AuditLogger::write($request, 'LOGIN_FAILED', 'user', $user->id, ['reason' => 'organization_suspended'], false, $user->org_id, $user, 'user', $user->role);

            return response()->json(['message' => 'Your organization is suspended. Contact the BlockBug platform administrator.'], 403);
        }
        [$plain, $expiresAt] = $this->issueToken('user', $user->id);
        DB::table('organizations')->where('id', $organization->id)->update(['last_activity_at' => now()]);
        AuditLogger::write($request, 'LOGIN_SUCCESS', 'user', $user->id, [], true, $user->org_id, $user, 'user', $user->role);

        return response()->json([
            'token' => $plain,
            'expiresAt' => $expiresAt,
            'user' => $this->organizationUserPayload($user, $organization),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('blockbug_actor');
        if ($request->attributes->get('blockbug_actor_type') === 'platform_admin') {
            return response()->json(['user' => $this->platformAdminPayload($actor)]);
        }

        return response()->json(['user' => $this->organizationUserPayload($actor, $request->attributes->get('blockbug_organization'))]);
    }

    public function logout(Request $request): JsonResponse
    {
        DB::table('access_tokens')->where('token_hash', hash('sha256', (string) $request->bearerToken()))->update(['revoked_at' => now()]);
        AuditLogger::write($request, 'LOGOUT', 'session');

        return response()->json(['ok' => true]);
    }

    private function issueToken(string $actorType, string $actorId): array
    {
        $plain = 'bbt_'.bin2hex(random_bytes(32));
        $expiresAt = now()->addHours(12);
        DB::table('access_tokens')->insert([
            'id' => 'tok-'.Str::lower(Str::random(16)),
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$plain, $expiresAt->toISOString()];
    }

    private function platformAdminPayload(object $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'super_admin',
            'platformRole' => 'SUPER_ADMIN',
            'organizationId' => null,
            'status' => $admin->status,
        ];
    }

    private function organizationUserPayload(object $user, object $organization): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'organizationRole' => $user->role === 'admin' ? 'ORGANIZATION_ADMIN' : Str::upper($user->role),
            'organizationId' => $organization->id,
            'organizationName' => $organization->name,
            'organizationEmail' => $organization->login_email,
            'organizationStatus' => $organization->status,
            'status' => $user->status,
            'avatar' => $user->avatar,
        ];
    }
}
