<?php

namespace App\Http\Controllers;

use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuperAdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $active = DB::table('organizations')->whereNull('deleted_at')->where('status', 'active')->count();
        $inactive = DB::table('organizations')->whereNull('deleted_at')->where('status', 'inactive')->count();

        return response()->json(['metrics' => [
            'totalOrganizations' => $active + $inactive,
            'activeOrganizations' => $active,
            'suspendedOrganizations' => $inactive,
            'totalUsers' => DB::table('users')->count(),
            'totalAdmins' => DB::table('users')->where('role', 'admin')->count(),
            'totalBugs' => DB::table('bugs')->count(),
            'totalProjects' => DB::table('projects')->count(),
            'pendingInvitations' => DB::table('invitations')->where('status', 'pending')->count(),
        ], 'recentOrganizations' => $this->organizationQuery()->latest('o.created_at')->limit(5)->get()->map(fn ($row) => $this->organizationPayload($row))->values(),
            'recentActivity' => DB::table('audit_logs')->latest('created_at')->limit(10)->get()->map(fn ($row) => $this->auditPayload($row))->values(),
        ]);
    }

    public function organizations(): JsonResponse
    {
        return response()->json(['organizations' => $this->organizationQuery()->orderByDesc('o.created_at')->get()->map(fn ($row) => $this->organizationPayload($row))->values()]);
    }

    public function organization(string $id): JsonResponse
    {
        $row = $this->organizationQuery()->where('o.id', $id)->first();
        if (! $row) {
            return response()->json(['message' => 'Organization not found.'], 404);
        }
        $payload = $this->organizationPayload($row);
        $payload['roleCounts'] = DB::table('users')->where('org_id', $id)->selectRaw('role, COUNT(*) total')->groupBy('role')->pluck('total', 'role');

        return response()->json(['organization' => $payload]);
    }

    public function updateOrganization(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:active,inactive']);
        $organization = DB::table('organizations')->where('id', $id)->whereNull('deleted_at')->first();
        if (! $organization) {
            return response()->json(['message' => 'Organization not found.'], 404);
        }
        DB::transaction(function () use ($id, $data): void {
            DB::table('organizations')->where('id', $id)->update(['status' => $data['status'], 'updated_at' => now()]);
            if ($data['status'] === 'inactive') {
                DB::table('access_tokens')->where('actor_type', 'user')->whereIn('actor_id', DB::table('users')->select('id')->where('org_id', $id))->whereNull('revoked_at')->update(['revoked_at' => now(), 'updated_at' => now()]);
            }
        });
        AuditLogger::write($request, $data['status'] === 'active' ? 'ORGANIZATION_ACTIVATED' : 'ORGANIZATION_DEACTIVATED', 'organization', $id, ['previousStatus' => $organization->status, 'newStatus' => $data['status']], true, $id);

        return $this->organization($id);
    }

    public function deleteOrganization(Request $request, string $id): JsonResponse
    {
        $organization = DB::table('organizations')->where('id', $id)->whereNull('deleted_at')->first();
        if (! $organization) {
            return response()->json(['message' => 'Organization not found.'], 404);
        }
        DB::transaction(function () use ($id): void {
            DB::table('organizations')->where('id', $id)->update(['status' => 'inactive', 'deleted_at' => now(), 'updated_at' => now()]);
            DB::table('access_tokens')->where('actor_type', 'user')->whereIn('actor_id', DB::table('users')->select('id')->where('org_id', $id))->whereNull('revoked_at')->update(['revoked_at' => now(), 'updated_at' => now()]);
            DB::table('invitations')->where('organization_id', $id)->where('status', 'pending')->update(['status' => 'revoked', 'revoked_at' => now(), 'updated_at' => now()]);
        });
        AuditLogger::write($request, 'ORGANIZATION_DELETED', 'organization', $id, ['softDeleted' => true, 'name' => $organization->name], true, $id);

        return response()->json(['ok' => true]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = DB::table('audit_logs');
        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->query('organization_id'));
        }
        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->query('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->query('to'));
        }

        return response()->json(['logs' => $query->latest('created_at')->limit(250)->get()->map(fn ($row) => $this->auditPayload($row))->values()]);
    }

    public function errorLogs(Request $request): JsonResponse
    {
        $query = DB::table('application_error_logs');
        foreach (['organization_id', 'level', 'module', 'http_status'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->query($filter));
            }
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->query('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->query('to'));
        }

        return response()->json(['logs' => $query->latest('created_at')->limit(250)->get()->map(fn ($row) => [
            'id' => $row->id,
            'organizationId' => $row->organization_id,
            'userId' => $row->user_id,
            'level' => $row->level,
            'errorType' => $row->error_type,
            'message' => $row->message,
            'module' => $row->module,
            'httpStatus' => $row->http_status,
            'requestId' => $row->request_id,
            'createdAt' => $row->created_at,
        ])->values()]);
    }

    private function organizationQuery()
    {
        return DB::table('organizations as o')
            ->whereNull('o.deleted_at')
            ->leftJoin('users as admin', function ($join): void {
                $join->on('admin.org_id', '=', 'o.id')->where('admin.role', '=', 'admin')->where('admin.status', '=', 'active');
            })
            ->selectRaw('o.*, MIN(admin.email) primary_admin_email, COUNT(DISTINCT admin.id) admin_count, (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id) user_count, (SELECT COUNT(*) FROM bugs b WHERE b.org_id = o.id) bug_count, (SELECT COUNT(*) FROM projects p WHERE p.org_id = o.id) project_count')
            ->groupBy('o.id', 'o.name', 'o.login_email', 'o.password_hash', 'o.status', 'o.created_at', 'o.updated_at', 'o.deleted_at', 'o.last_activity_at');
    }

    private function organizationPayload(object $row): array
    {
        return [
            'id' => $row->id,
            'name' => $row->name,
            'status' => $row->status,
            'primaryAdminEmail' => $row->primary_admin_email,
            'userCount' => (int) $row->user_count,
            'adminCount' => (int) $row->admin_count,
            'bugCount' => (int) $row->bug_count,
            'projectCount' => (int) $row->project_count,
            'createdAt' => $row->created_at,
            'lastActivityAt' => $row->last_activity_at,
        ];
    }

    private function auditPayload(object $row): array
    {
        return [
            'id' => $row->id,
            'organizationId' => $row->organization_id,
            'actorType' => $row->actor_type,
            'actorId' => $row->actor_id,
            'actorRole' => $row->actor_role,
            'action' => $row->action,
            'entityType' => $row->entity_type,
            'entityId' => $row->entity_id,
            'succeeded' => (bool) $row->succeeded,
            'metadata' => $row->metadata ? json_decode($row->metadata, true) : null,
            'ipAddress' => $row->ip_address,
            'requestId' => $row->request_id,
            'createdAt' => $row->created_at,
        ];
    }
}
