<?php

namespace App\Http\Controllers;

use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class InvitationController extends Controller
{
    private const ROLES = ['admin', 'manager', 'developer', 'tester'];

    public function inspect(Request $request): JsonResponse
    {
        $token = (string) $request->validate(['token' => 'required|string'])['token'];
        $invitation = $this->findToken($token);
        if (! $invitation) {
            return response()->json(['message' => 'This invitation is invalid.'], 404);
        }
        if ($invitation->status !== 'pending') {
            return response()->json(['message' => $invitation->status === 'accepted' ? 'This invitation has already been accepted.' : 'This invitation is no longer valid.'], 410);
        }
        if (now()->greaterThan($invitation->expires_at)) {
            DB::table('invitations')->where('id', $invitation->id)->update(['status' => 'expired', 'updated_at' => now()]);

            return response()->json(['message' => 'This invitation has expired.'], 410);
        }
        $organization = $invitation->organization_id ? DB::table('organizations')->where('id', $invitation->organization_id)->first() : null;

        return response()->json(['invitation' => $this->payload($invitation, $organization)]);
    }

    public function accept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string',
            'name' => 'required|string|max:120',
            'password' => 'required|string|min:8|confirmed',
            'organizationName' => 'nullable|string|max:160',
        ]);
        $token = $data['token'];
        $invitation = $this->findToken($token);
        if (! $invitation || $invitation->status !== 'pending' || now()->greaterThan($invitation->expires_at)) {
            return response()->json(['message' => 'This invitation is invalid, expired, or already used.'], 410);
        }
        if (DB::table('users')->whereRaw('LOWER(email) = ?', [Str::lower($invitation->email)])->exists()
            || DB::table('platform_admins')->whereRaw('LOWER(email) = ?', [Str::lower($invitation->email)])->exists()) {
            return response()->json(['message' => 'An account with this email already exists.'], 409);
        }
        if ($invitation->type === 'organization' && empty($data['organizationName'])) {
            return response()->json(['message' => 'Organization name is required.'], 422);
        }

        [$userId, $organizationId] = DB::transaction(function () use ($invitation, $data): array {
            $locked = DB::table('invitations')->where('id', $invitation->id)->lockForUpdate()->first();
            if (! $locked || $locked->status !== 'pending' || now()->greaterThan($locked->expires_at)) {
                abort(410, 'This invitation is invalid, expired, or already used.');
            }
            $organizationId = $locked->organization_id;
            if ($locked->type === 'organization') {
                $organizationId = 'org-'.Str::lower(Str::random(16));
                DB::table('organizations')->insert([
                    'id' => $organizationId,
                    'name' => trim($data['organizationName']),
                    'login_email' => 'workspace+'.Str::lower(Str::random(12)).'@blockbug.invalid',
                    'password_hash' => Hash::make(Str::random(48)),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $organization = DB::table('organizations')->where('id', $organizationId)->where('status', 'active')->whereNull('deleted_at')->first();
                if (! $organization) {
                    abort(410, 'The organization is not active.');
                }
            }
            $userId = 'user-'.Str::lower(Str::random(16));
            DB::table('users')->insert([
                'id' => $userId,
                'org_id' => $organizationId,
                'name' => trim($data['name']),
                'email' => Str::lower($locked->email),
                'password_hash' => Hash::make($data['password']),
                'role' => $locked->role,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('invitations')->where('id', $locked->id)->update([
                'organization_id' => $organizationId,
                'status' => 'accepted',
                'accepted_at' => now(),
                'updated_at' => now(),
            ]);

            return [$userId, $organizationId];
        });

        $accepted = DB::table('invitations')->where('id', $invitation->id)->first();
        AuditLogger::write($request, $accepted->type === 'organization' ? 'ORGANIZATION_INVITE_ACCEPTED' : 'USER_INVITE_ACCEPTED', 'invitation', $accepted->id, ['email' => $accepted->email, 'role' => $accepted->role], true, $organizationId);

        return response()->json(['ok' => true, 'userId' => $userId, 'organizationId' => $organizationId]);
    }

    public function createOrganizationInvitation(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email|max:180']);

        return $this->create($request, 'organization', Str::lower($data['email']), 'admin', null, 'SUPER_ADMIN_CREATED_ORGANIZATION_INVITE');
    }

    public function createUserInvitation(Request $request): JsonResponse
    {
        if ($request->attributes->get('blockbug_organization_role') !== 'admin') {
            return response()->json(['message' => 'Organization Admin access is required.'], 403);
        }
        $data = $request->validate(['email' => 'required|email|max:180', 'role' => 'required|in:admin,manager,developer,tester']);

        return $this->create($request, 'user', Str::lower($data['email']), $data['role'], $request->attributes->get('blockbug_organization_id'), 'USER_INVITED');
    }

    public function organizationInvitations(Request $request): JsonResponse
    {
        $rows = DB::table('invitations')->where('type', 'organization')->latest()->get();

        return response()->json(['invitations' => $rows->map(fn ($row) => $this->payload($row))->values()]);
    }

    public function userInvitations(Request $request): JsonResponse
    {
        $rows = DB::table('invitations')->where('type', 'user')->where('organization_id', $request->attributes->get('blockbug_organization_id'))->latest()->get();

        return response()->json(['invitations' => $rows->map(fn ($row) => $this->payload($row))->values()]);
    }

    public function revoke(Request $request, string $id): JsonResponse
    {
        $invitation = $this->authorizedInvitation($request, $id);
        if ($invitation instanceof JsonResponse) {
            return $invitation;
        }
        if ($invitation->status !== 'pending') {
            return response()->json(['message' => 'Only pending invitations can be revoked.'], 422);
        }
        DB::table('invitations')->where('id', $id)->update(['status' => 'revoked', 'revoked_at' => now(), 'updated_at' => now()]);
        AuditLogger::write($request, 'INVITATION_REVOKED', 'invitation', $id, ['email' => $invitation->email], true, $invitation->organization_id);

        return response()->json(['ok' => true]);
    }

    public function regenerate(Request $request, string $id): JsonResponse
    {
        $invitation = $this->authorizedInvitation($request, $id);
        if ($invitation instanceof JsonResponse) {
            return $invitation;
        }
        if ($invitation->status === 'accepted') {
            return response()->json(['message' => 'Accepted invitations cannot be regenerated.'], 422);
        }
        $plain = $this->newToken();
        DB::table('invitations')->where('id', $id)->update([
            'token_hash' => hash('sha256', $plain),
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
            'accepted_at' => null,
            'revoked_at' => null,
            'updated_at' => now(),
        ]);
        AuditLogger::write($request, 'INVITATION_REGENERATED', 'invitation', $id, ['email' => $invitation->email], true, $invitation->organization_id);

        return response()->json(['invitation' => $this->payload(DB::table('invitations')->find($id)), 'token' => $plain]);
    }

    private function create(Request $request, string $type, string $email, string $role, ?string $organizationId, string $action): JsonResponse
    {
        if ($role === 'super_admin') {
            return response()->json(['message' => 'SUPER_ADMIN cannot be assigned through an organization invitation.'], 403);
        }
        if (DB::table('users')->whereRaw('LOWER(email) = ?', [$email])->exists() || DB::table('platform_admins')->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return response()->json(['message' => 'An account with this email already exists.'], 409);
        }
        DB::table('invitations')->where('email', $email)->where('type', $type)->where('status', 'pending')->when($organizationId, fn ($q) => $q->where('organization_id', $organizationId))->update(['status' => 'revoked', 'revoked_at' => now(), 'updated_at' => now()]);
        $plain = $this->newToken();
        $id = 'inv-'.Str::lower(Str::random(16));
        $actor = $request->attributes->get('blockbug_actor');
        DB::table('invitations')->insert([
            'id' => $id,
            'type' => $type,
            'organization_id' => $organizationId,
            'email' => $email,
            'role' => $role,
            'token_hash' => hash('sha256', $plain),
            'status' => 'pending',
            'created_by_type' => $request->attributes->get('blockbug_actor_type'),
            'created_by_id' => $actor->id,
            'expires_at' => now()->addDays(7),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        AuditLogger::write($request, $action, 'invitation', $id, ['email' => $email, 'role' => $role], true, $organizationId);

        return response()->json(['invitation' => $this->payload(DB::table('invitations')->find($id)), 'token' => $plain], 201);
    }

    private function findToken(string $token): ?object
    {
        // Accept compact URL-safe tokens and previously issued 64-character hex tokens.
        if (! preg_match('/^[A-Za-z0-9_-]{20,86}$/', $token)) {
            return null;
        }

        return DB::table('invitations')->where('token_hash', hash('sha256', $token))->first();
    }

    private function newToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(18)), '+/', '-_'), '=');
    }

    private function authorizedInvitation(Request $request, string $id)
    {
        $query = DB::table('invitations')->where('id', $id);
        if ($request->attributes->get('blockbug_actor_type') !== 'platform_admin') {
            if ($request->attributes->get('blockbug_organization_role') !== 'admin') {
                return response()->json(['message' => 'Organization Admin access is required.'], 403);
            }
            $query->where('type', 'user')->where('organization_id', $request->attributes->get('blockbug_organization_id'));
        }

        return $query->first() ?: response()->json(['message' => 'Invitation not found.'], 404);
    }

    private function payload(object $row, ?object $organization = null): array
    {
        return [
            'id' => $row->id,
            'type' => $row->type,
            'email' => $row->email,
            'role' => $row->role,
            'organizationId' => $row->organization_id,
            'organizationName' => $organization->name ?? null,
            'status' => $row->status,
            'expiresAt' => $row->expires_at,
            'acceptedAt' => $row->accepted_at,
            'createdAt' => $row->created_at,
        ];
    }
}
