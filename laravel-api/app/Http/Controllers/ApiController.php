<?php

namespace App\Http\Controllers;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ApiController extends Controller
{
    private const ROLES = ['admin', 'manager', 'developer', 'tester'];
    private const PREFERENCES = [
        'email_notifications' => true,
        'bug_assigned' => true,
        'comment_notifications' => true,
        'daily_digest' => true,
    ];

    private function orgId(Request $request): ?string
    {
        return $request->header('X-Organization-Id')
            ?: DB::table('organizations')->oldest('created_at')->value('id');
    }

    private function id(string $prefix = ''): string
    {
        return $prefix.Str::lower(Str::random(12));
    }

    private function record(object|array|null $record): ?array
    {
        if ($record === null) {
            return null;
        }

        $mapped = [];
        foreach ((array) $record as $key => $value) {
            $mapped[Str::camel((string) $key)] = $value;
        }
        return $mapped;
    }

    private function records(iterable $records): array
    {
        return array_values(array_map(fn ($row) => $this->record($row), is_array($records) ? $records : $records->all()));
    }

    private function publicUser(object|array|null $user, object|array|null $organization = null): ?array
    {
        $row = $this->record($user);
        if (!$row) {
            return null;
        }
        unset($row['passwordHash']);
        if ($organization) {
            $org = $this->record($organization);
            $row['organizationId'] = $org['id'];
            $row['organizationName'] = $org['name'];
            $row['organizationEmail'] = $org['loginEmail'];
        }
        return $row;
    }

    private function projectRecord(object|array $project): array
    {
        $row = $this->record($project);
        $row['key'] = $row['projectKey'];
        unset($row['projectKey']);
        return $row;
    }

    private function actorRole(Request $request): string
    {
        return (string) ($request->input('actorRole') ?: $request->query('actor_role', ''));
    }

    private function requireAdmin(Request $request): ?JsonResponse
    {
        return $this->actorRole($request) === 'admin'
            ? null
            : response()->json(['message' => 'Administrator access is required.'], 403);
    }

    private function notify(?string $orgId, string $title, string $body, string $type, ?string $entityType = null, ?string $entityId = null, ?string $page = null, ?string $email = null): void
    {
        if (!$orgId) {
            return;
        }
        DB::table('notifications')->insert([
            'id' => $this->id('notif-'),
            'org_id' => $orgId,
            'user_email' => $email,
            'title' => $title,
            'body' => $body,
            'type' => $type,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'target_page' => $page,
            'is_read' => false,
            'created_at' => now(),
        ]);
    }

    private function settings(): array
    {
        $settings = [
            'default_bug_status' => 'open',
            'default_bug_priority' => 'medium',
            'default_bug_severity' => 'major',
            'default_assignee_rule' => 'unassigned',
            'app_name' => 'BlockBug',
            'timezone' => 'Asia/Karachi',
            'date_format' => 'Y-m-d',
            'dashboard_default_view' => 'overview',
            'session_timeout_minutes' => 120,
            'allow_signup' => true,
        ];
        foreach (DB::table('system_settings')->get() as $row) {
            $settings[$row->setting_key] = json_decode($row->setting_value, true);
        }
        return $settings;
    }

    private function statsFor(?string $orgId): array
    {
        $query = DB::table('bugs')->where('org_id', $orgId);
        $counts = (clone $query)->selectRaw("COUNT(*) total, SUM(status='open') open_count, SUM(status='in-progress') progress_count, SUM(status='resolved') resolved_count, SUM(status='closed') closed_count, SUM(priority='critical') critical_count, SUM(priority='high') high_count")->first();
        return [
            'total' => (int) ($counts->total ?? 0),
            'open' => (int) ($counts->open_count ?? 0),
            'inProgress' => (int) ($counts->progress_count ?? 0),
            'resolved' => (int) ($counts->resolved_count ?? 0),
            'closed' => (int) ($counts->closed_count ?? 0),
            'critical' => (int) ($counts->critical_count ?? 0),
            'high' => (int) ($counts->high_count ?? 0),
        ];
    }

    public function health(): JsonResponse
    {
        DB::connection()->getPdo();
        return response()->json(['ok' => true, 'service' => 'BlockBug Laravel API']);
    }

    public function organizationLogin(Request $request): JsonResponse
    {
        $data = $request->validate(['organizationEmail' => 'required|string', 'organizationPassword' => 'required|string']);
        $organization = DB::table('organizations')->where('login_email', $data['organizationEmail'])->where('status', 'active')->first();
        if (!$organization || !Hash::check($data['organizationPassword'], $organization->password_hash)) {
            return response()->json(['message' => 'Invalid organization ID or password'], 401);
        }
        $public = $this->record($organization);
        unset($public['passwordHash']);
        return response()->json(['organization' => $public]);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'organizationEmail' => 'required|string', 'organizationPassword' => 'required|string',
            'email' => 'required|email', 'password' => 'required|string',
        ]);
        $organization = DB::table('organizations')->where('login_email', $data['organizationEmail'])->where('status', 'active')->first();
        if (!$organization || !Hash::check($data['organizationPassword'], $organization->password_hash)) {
            return response()->json(['message' => 'Invalid organization ID or password'], 401);
        }
        return $this->memberLoginFor($organization, $data['email'], $data['password']);
    }

    public function memberLogin(Request $request): JsonResponse
    {
        $data = $request->validate(['organizationId' => 'required|string', 'email' => 'required|email', 'password' => 'required|string']);
        $organization = DB::table('organizations')->where('id', $data['organizationId'])->where('status', 'active')->first();
        if (!$organization) {
            return response()->json(['message' => 'Organization not found or inactive'], 404);
        }
        return $this->memberLoginFor($organization, $data['email'], $data['password']);
    }

    private function memberLoginFor(object $organization, string $email, string $password): JsonResponse
    {
        $user = DB::table('users')->where('org_id', $organization->id)->where('email', $email)->where('status', 'active')->first();
        if (!$user || !Hash::check($password, $user->password_hash)) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }
        return response()->json(['user' => $this->publicUser($user, $organization)]);
    }

    public function signup(Request $request): JsonResponse
    {
        if (!$this->settings()['allow_signup']) {
            return response()->json(['message' => 'Public signup is disabled. Ask an administrator to create your account.'], 403);
        }
        $data = $request->validate([
            'organizationName' => 'required|string|max:160', 'organizationEmail' => 'required|string|max:180',
            'organizationPassword' => 'required|string|min:6', 'adminName' => 'required|string|max:120',
            'adminEmail' => 'required|email|max:180', 'adminPassword' => 'required|string|min:6',
        ]);
        if (DB::table('organizations')->where('login_email', $data['organizationEmail'])->exists()) {
            return response()->json(['message' => 'An organization with this ID already exists.'], 409);
        }
        $organizationId = $this->id('org-');
        $userId = $this->id('user-');
        DB::transaction(function () use ($data, $organizationId, $userId): void {
            DB::table('organizations')->insert([
                'id' => $organizationId, 'name' => $data['organizationName'], 'login_email' => $data['organizationEmail'],
                'password_hash' => Hash::make($data['organizationPassword']), 'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('users')->insert([
                'id' => $userId, 'org_id' => $organizationId, 'name' => $data['adminName'], 'email' => $data['adminEmail'],
                'password_hash' => Hash::make($data['adminPassword']), 'role' => 'admin', 'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
        });
        $organization = DB::table('organizations')->find($organizationId);
        $user = DB::table('users')->find($userId);
        return response()->json(['user' => $this->publicUser($user, $organization)], 201);
    }

    public function users(Request $request): JsonResponse
    {
        $users = DB::table('users')->where('org_id', $this->orgId($request))->orderBy('name')->get();
        return response()->json(['users' => array_map(fn ($user) => $this->publicUser($user), $users->all())]);
    }

    public function createUser(Request $request): JsonResponse
    {
        if ($denied = $this->requireAdmin($request)) return $denied;
        $data = $request->validate(['name' => 'required|string|max:120', 'email' => 'required|email|max:180', 'password' => 'required|min:6', 'role' => 'required|in:admin,manager,developer,tester', 'status' => 'nullable|in:active,inactive']);
        $orgId = $this->orgId($request);
        if (DB::table('users')->where('org_id', $orgId)->where('email', $data['email'])->exists()) {
            return response()->json(['message' => 'An account with this email already exists.'], 409);
        }
        $id = $this->id('user-');
        DB::table('users')->insert([
            'id' => $id, 'org_id' => $orgId, 'name' => $data['name'], 'email' => $data['email'],
            'password_hash' => Hash::make($data['password']), 'role' => $data['role'], 'status' => $data['status'] ?? 'active',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->notify($orgId, 'Team member added', $data['name'].' was added as '.$data['role'], 'user_created', 'user', $id, 'team');
        return response()->json(['user' => $this->publicUser(DB::table('users')->find($id))], 201);
    }

    public function roles(): JsonResponse
    {
        return response()->json(['roles' => [
            'admin' => ['label' => 'Administrator', 'description' => 'Full system access with user management and settings control.', 'permissions' => ['Full system access', 'Manage users', 'Configure settings']],
            'manager' => ['label' => 'Manager', 'description' => 'Reviews bug pipelines, assigns work, and monitors reporting.', 'permissions' => ['Review pipelines', 'Assign bugs', 'View reports']],
            'developer' => ['label' => 'Developer', 'description' => 'Fixes assigned bugs and keeps reports updated through the workflow.', 'permissions' => ['Fix bugs', 'Comment on bug reports', 'Update bug status']],
            'tester' => ['label' => 'Tester', 'description' => 'Reports bugs, tracks submitted reports, and verifies completed fixes.', 'permissions' => ['Report bugs', 'Track their reports', 'Verify fixes']],
        ]]);
    }

    public function updateUser(Request $request, string $id): JsonResponse
    {
        $onlyName = $request->has('name') && !$request->hasAny(['role', 'status']);
        if (!$onlyName && ($denied = $this->requireAdmin($request))) return $denied;
        $orgId = $this->orgId($request);
        $updates = $request->only(['name', 'role', 'status']);
        if (!$updates) return response()->json(['message' => 'No supported fields were provided.'], 422);
        $updates['updated_at'] = now();
        if (!DB::table('users')->where('id', $id)->where('org_id', $orgId)->update($updates)) {
            if (!DB::table('users')->where('id', $id)->where('org_id', $orgId)->exists()) return response()->json(['message' => 'User not found'], 404);
        }
        return response()->json(['user' => $this->publicUser(DB::table('users')->find($id))]);
    }

    public function deleteUser(Request $request, string $id): JsonResponse
    {
        if ($denied = $this->requireAdmin($request)) return $denied;
        $orgId = $this->orgId($request);
        $user = DB::table('users')->where('id', $id)->where('org_id', $orgId)->first();
        if (!$user) return response()->json(['message' => 'User not found'], 404);
        DB::table('users')->where('id', $id)->delete();
        $this->notify($orgId, 'User deleted', $user->name.' was removed from the workspace', 'user_deleted', 'user', $id, 'team');
        return response()->json(['ok' => true]);
    }

    public function changePassword(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['currentPassword' => 'required|string', 'newPassword' => 'required|string|min:6']);
        $user = DB::table('users')->where('id', $id)->where('org_id', $this->orgId($request))->first();
        if (!$user || !Hash::check($data['currentPassword'], $user->password_hash)) return response()->json(['message' => 'Current password is incorrect.'], 422);
        DB::table('users')->where('id', $id)->update(['password_hash' => Hash::make($data['newPassword']), 'updated_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function projects(Request $request): JsonResponse
    {
        $rows = DB::table('projects')->where('org_id', $this->orgId($request))->latest('created_at')->get();
        return response()->json(['projects' => array_map(fn ($row) => $this->projectRecord($row), $rows->all())]);
    }

    public function createProject(Request $request): JsonResponse
    {
        if (!in_array($this->actorRole($request), ['admin', 'manager'], true)) return response()->json(['message' => 'Manager or administrator access is required.'], 403);
        $data = $request->validate(['name' => 'required|string|max:160', 'description' => 'required|string', 'key' => 'required|string|max:20', 'teamSize' => 'nullable|integer|min:1', 'status' => 'nullable|in:active,archived']);
        $orgId = $this->orgId($request);
        if (DB::table('projects')->where('org_id', $orgId)->where('project_key', strtoupper($data['key']))->exists()) return response()->json(['message' => 'A project with this key already exists.'], 409);
        $id = $this->id('proj-');
        DB::table('projects')->insert(['id' => $id, 'org_id' => $orgId, 'name' => $data['name'], 'description' => $data['description'], 'project_key' => strtoupper($data['key']), 'team_size' => $data['teamSize'] ?? 1, 'status' => $data['status'] ?? 'active', 'created_at' => now(), 'updated_at' => now()]);
        $this->notify($orgId, 'Project created', strtoupper($data['key']).' - '.$data['name'].' is ready for bug reports', 'project_created', 'project', $id, 'projects');
        return response()->json(['project' => $this->projectRecord(DB::table('projects')->find($id))], 201);
    }

    public function deleteProject(Request $request, string $id): JsonResponse
    {
        if (!in_array($this->actorRole($request), ['admin', 'manager'], true)) return response()->json(['message' => 'Manager or administrator access is required.'], 403);
        $orgId = $this->orgId($request);
        $project = DB::table('projects')->where('id', $id)->where('org_id', $orgId)->first();
        if (!$project) return response()->json(['message' => 'Project not found'], 404);
        DB::table('projects')->where('id', $id)->delete();
        $this->notify($orgId, 'Project deleted', $project->name.' was deleted', 'project_deleted', 'project', $id, 'projects');
        return response()->json(['ok' => true]);
    }

    public function sprints(Request $request, string $projectId): JsonResponse
    {
        $rows = DB::table('sprints')->where('org_id', $this->orgId($request))->where('project_id', $projectId)->orderBy('start_date')->get();
        return response()->json(['sprints' => $this->records($rows)]);
    }

    public function createSprint(Request $request, string $projectId): JsonResponse
    {
        if (!in_array($this->actorRole($request), ['admin', 'manager'], true)) return response()->json(['message' => 'Manager or administrator access is required.'], 403);
        $data = $request->validate(['name' => 'required|string|max:160', 'goal' => 'nullable|string', 'startDate' => 'required|date', 'endDate' => 'required|date|after_or_equal:startDate', 'status' => 'nullable|in:planned,active,completed,cancelled', 'userEmail' => 'nullable|string']);
        $orgId = $this->orgId($request);
        if (!DB::table('projects')->where('id', $projectId)->where('org_id', $orgId)->exists()) return response()->json(['message' => 'Project not found'], 404);
        $id = $this->id('sprint-');
        DB::table('sprints')->insert(['id' => $id, 'org_id' => $orgId, 'project_id' => $projectId, 'name' => $data['name'], 'goal' => $data['goal'] ?? null, 'status' => $data['status'] ?? 'planned', 'start_date' => $data['startDate'], 'end_date' => $data['endDate'], 'created_by' => $data['userEmail'] ?? null, 'created_at' => now(), 'updated_at' => now()]);
        $this->notify($orgId, 'Sprint created', $data['name'].' was added to the project', 'sprint_created', 'project', $projectId, 'projects');
        return response()->json(['sprint' => $this->record(DB::table('sprints')->find($id))], 201);
    }

    public function updateSprint(Request $request, string $id): JsonResponse
    {
        if (!in_array($this->actorRole($request), ['admin', 'manager'], true)) return response()->json(['message' => 'Manager or administrator access is required.'], 403);
        $orgId = $this->orgId($request);
        $sprint = DB::table('sprints')->where('id', $id)->where('org_id', $orgId)->first();
        if (!$sprint) return response()->json(['message' => 'Sprint not found'], 404);
        $map = ['name' => 'name', 'goal' => 'goal', 'status' => 'status', 'startDate' => 'start_date', 'endDate' => 'end_date'];
        $updates = [];
        foreach ($map as $input => $column) if ($request->exists($input)) $updates[$column] = $request->input($input);
        if (isset($updates['start_date']) || isset($updates['end_date'])) {
            $start = $updates['start_date'] ?? $sprint->start_date;
            $end = $updates['end_date'] ?? $sprint->end_date;
            if (strtotime($end) < strtotime($start)) return response()->json(['message' => 'Sprint end date must be on or after its start date.'], 422);
        }
        $updates['updated_at'] = now();
        DB::table('sprints')->where('id', $id)->update($updates);
        return response()->json(['sprint' => $this->record(DB::table('sprints')->find($id))]);
    }

    public function completeSprint(Request $request, string $id): JsonResponse
    {
        if (!in_array($this->actorRole($request), ['admin', 'manager'], true)) return response()->json(['message' => 'Manager or administrator access is required.'], 403);
        $orgId = $this->orgId($request);
        $sprint = DB::table('sprints')->where('id', $id)->where('org_id', $orgId)->first();
        if (!$sprint) return response()->json(['message' => 'Sprint not found'], 404);
        $action = $request->input('completionAction', 'backlog');
        $targetId = $action === 'another_sprint' ? $request->input('targetSprintId') : null;
        if ($targetId && !DB::table('sprints')->where('id', $targetId)->where('org_id', $orgId)->where('project_id', $sprint->project_id)->exists()) return response()->json(['message' => 'Target sprint was not found.'], 422);
        $bugs = DB::table('bugs')->where('org_id', $orgId)->where('sprint_id', $id)->whereIn('status', ['open', 'in-progress'])->get();
        DB::transaction(function () use ($bugs, $orgId, $id, $targetId, $request): void {
            foreach ($bugs as $bug) {
                DB::table('bugs')->where('id', $bug->id)->update(['sprint_id' => $targetId, 'updated_at' => now()]);
                DB::table('sprint_bug_history')->insert(['id' => $this->id('move-'), 'org_id' => $orgId, 'bug_id' => $bug->id, 'from_sprint_id' => $id, 'to_sprint_id' => $targetId, 'moved_by' => $request->input('userEmail'), 'reason' => $targetId ? 'sprint_completed_move' : 'sprint_completed_backlog', 'moved_at' => now()]);
            }
            DB::table('sprints')->where('id', $id)->update(['status' => 'completed', 'completed_at' => now(), 'updated_at' => now()]);
        });
        return response()->json(['sprint' => $this->record(DB::table('sprints')->find($id)), 'movedBugIds' => $bugs->pluck('id')->all()]);
    }

    public function bugs(Request $request): JsonResponse
    {
        $query = DB::table('bugs')->where('org_id', $this->orgId($request));
        if ($request->filled('reported_by')) $query->where('reported_by', $request->query('reported_by'));
        if ($request->query('actor_role') === 'tester' && $request->filled('actor_email')) {
            $email = $request->query('actor_email');
            $query->where(fn ($q) => $q->where('reported_by', $email)->orWhere('verification_tester_email', $email));
        }
        if ($request->query('actor_role') === 'developer' && $request->filled('actor_email')) $query->where('assigned_to', $request->query('actor_email'));
        return response()->json(['bugs' => $this->records($query->latest('created_at')->get())]);
    }

    public function createBug(Request $request): JsonResponse
    {
        $data = $request->validate(['title' => 'required|string|max:255', 'description' => 'required|string', 'priority' => 'required|in:low,medium,high,critical', 'severity' => 'required|in:minor,major,critical', 'projectId' => 'required|string', 'sprintId' => 'nullable|string', 'reportedBy' => 'required|string', 'assignedTo' => 'nullable|string', 'verificationTesterEmail' => 'nullable|string', 'stepsToReproduce' => 'nullable|string', 'expectedResult' => 'nullable|string', 'actualResult' => 'nullable|string', 'environment' => 'nullable|string', 'attachment' => 'nullable|file|max:10240']);
        $orgId = $this->orgId($request);
        if (!DB::table('projects')->where('id', $data['projectId'])->where('org_id', $orgId)->exists()) return response()->json(['message' => 'Project not found'], 404);
        $id = $this->id('bug-');
        $settings = $this->settings();
        DB::table('bugs')->insert([
            'id' => $id, 'org_id' => $orgId, 'title' => $data['title'], 'description' => $data['description'],
            'status' => $settings['default_bug_status'], 'priority' => $data['priority'], 'severity' => $data['severity'],
            'project_id' => $data['projectId'], 'sprint_id' => $data['sprintId'] ?? null, 'assigned_to' => $data['assignedTo'] ?? null,
            'reported_by' => $data['reportedBy'], 'verification_tester_email' => $data['verificationTesterEmail'] ?? null,
            'steps_to_reproduce' => $data['stepsToReproduce'] ?? null, 'expected_result' => $data['expectedResult'] ?? null,
            'actual_result' => $data['actualResult'] ?? null, 'environment' => $data['environment'] ?? null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('activities')->insert(['id' => $this->id('act-'), 'org_id' => $orgId, 'bug_id' => $id, 'type' => 'created', 'user_id' => $data['reportedBy'], 'user_name' => $data['reportedBy'], 'message' => 'Created new bug report', 'created_at' => now()]);
        $attachment = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $originalName = $file->getClientOriginalName();
            $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
            $fileSize = $file->getSize();
            $storedName = $id.'-'.Str::random(8).'.'.$file->getClientOriginalExtension();
            $file->move(public_path('uploads/bugs'), $storedName);
            $attachmentId = $this->id('file-');
            DB::table('bug_attachments')->insert(['id' => $attachmentId, 'bug_id' => $id, 'original_name' => $originalName, 'stored_name' => $storedName, 'file_path' => '/uploads/bugs/'.$storedName, 'mime_type' => $mimeType, 'file_size' => $fileSize, 'uploaded_by' => $data['reportedBy'], 'created_at' => now()]);
            $attachment = $this->attachmentRecord(DB::table('bug_attachments')->find($attachmentId));
        }
        $this->notify($orgId, 'New bug reported', $data['title'], 'bug_created', 'bug', $id, 'bugs');

        /*
         * Legacy blockchain recording was intentionally removed from runtime.
         * The UI wording remains for product presentation, but Laravel stores bug
         * workflow data only in MySQL and calls no chain, wallet, node, or audit service.
         */

        return response()->json(['bug' => $this->record(DB::table('bugs')->find($id)), 'attachment' => $attachment], 201);
    }

    private function attachmentRecord(object $attachment): array
    {
        $row = $this->record($attachment);
        $row['url'] = url($row['filePath']);
        return $row;
    }

    public function attachments(Request $request, string $bugId): JsonResponse
    {
        $owned = DB::table('bugs')->where('id', $bugId)->where('org_id', $this->orgId($request))->exists();
        if (!$owned) return response()->json(['message' => 'Bug not found'], 404);
        $rows = DB::table('bug_attachments')->where('bug_id', $bugId)->latest('created_at')->get();
        return response()->json(['attachments' => array_map(fn ($row) => $this->attachmentRecord($row), $rows->all())]);
    }

    public function legacyProofEvents(Request $request, string $bugId): JsonResponse
    {
        /*
         * Compatibility-only read path for historical records. No blockchain code
         * runs here. New React screens may keep their existing "Blockchain Proof"
         * labels while the application itself remains React + Laravel + MySQL only.
         */
        if (!Schema::hasTable('bug_blockchain_events')) return response()->json(['events' => []]);
        $owned = DB::table('bugs')->where('id', $bugId)->where('org_id', $this->orgId($request))->exists();
        if (!$owned) return response()->json(['message' => 'Bug not found'], 404);
        return response()->json(['events' => $this->records(DB::table('bug_blockchain_events')->where('bug_id', $bugId)->latest('created_at')->limit(20)->get())]);
    }

    public function updateBug(Request $request, string $id): JsonResponse
    {
        $orgId = $this->orgId($request);
        $bug = DB::table('bugs')->where('id', $id)->where('org_id', $orgId)->first();
        if (!$bug) return response()->json(['message' => 'Bug not found'], 404);
        $map = ['status' => 'status', 'assignedTo' => 'assigned_to', 'verificationTesterEmail' => 'verification_tester_email', 'sprintId' => 'sprint_id'];
        $updates = [];
        foreach ($map as $input => $column) if ($request->exists($input)) $updates[$column] = $request->input($input) ?: null;
        if (!$updates) return response()->json(['message' => 'No supported fields were provided.'], 422);
        if (($updates['status'] ?? null) === 'closed') $updates['verified_at'] = now();
        if (($updates['status'] ?? null) === 'open') $updates['verified_at'] = null;
        $updates['updated_at'] = now();
        DB::table('bugs')->where('id', $id)->update($updates);
        $type = array_key_exists('status', $updates) ? (($updates['status'] === 'closed') ? 'verified' : 'status_changed') : 'assigned';
        DB::table('activities')->insert(['id' => $this->id('act-'), 'org_id' => $orgId, 'bug_id' => $id, 'type' => $type, 'user_id' => $request->input('userEmail', 'system'), 'user_name' => $request->input('userName', 'System'), 'message' => $type === 'assigned' ? 'Updated bug assignment' : 'Changed status to '.($updates['status'] ?? $bug->status), 'created_at' => now()]);
        $this->notify($orgId, 'Bug updated', $bug->title.' was updated', 'bug_updated', 'bug', $id, 'bugs');
        return response()->json(['bug' => $this->record(DB::table('bugs')->find($id))]);
    }

    public function comments(Request $request, string $bugId): JsonResponse
    {
        $owned = DB::table('bugs')->where('id', $bugId)->where('org_id', $this->orgId($request))->exists();
        if (!$owned) return response()->json(['message' => 'Bug not found'], 404);
        return response()->json(['comments' => $this->records(DB::table('bug_comments')->where('bug_id', $bugId)->oldest('created_at')->get())]);
    }

    public function createComment(Request $request, string $bugId): JsonResponse
    {
        $data = $request->validate(['comment' => 'required|string', 'userEmail' => 'required|string', 'userName' => 'required|string', 'parentCommentId' => 'nullable|string']);
        $orgId = $this->orgId($request);
        $bug = DB::table('bugs')->where('id', $bugId)->where('org_id', $orgId)->first();
        if (!$bug) return response()->json(['message' => 'Bug not found'], 404);
        $id = $this->id('comment-');
        DB::table('bug_comments')->insert(['id' => $id, 'bug_id' => $bugId, 'parent_comment_id' => $data['parentCommentId'] ?? null, 'user_email' => $data['userEmail'], 'user_name' => $data['userName'], 'comment' => $data['comment'], 'created_at' => now()]);
        DB::table('activities')->insert(['id' => $this->id('act-'), 'org_id' => $orgId, 'bug_id' => $bugId, 'type' => 'commented', 'user_id' => $data['userEmail'], 'user_name' => $data['userName'], 'message' => isset($data['parentCommentId']) ? 'Replied to a comment' : 'Added a comment', 'created_at' => now()]);
        $this->notify($orgId, 'Comment on '.strtoupper(substr($bugId, 0, 8)), $data['userName'].': '.Str::limit($data['comment'], 90), 'comment_added', 'bug', $bugId, 'bugs');
        return response()->json(['comment' => $this->record(DB::table('bug_comments')->find($id))], 201);
    }

    public function activities(Request $request): JsonResponse
    {
        $rows = DB::table('activities')->where('org_id', $this->orgId($request))->latest('created_at')->limit(20)->get();
        $activities = $this->records($rows);
        foreach ($activities as &$activity) $activity['timestamp'] = $activity['createdAt'];
        return response()->json(['activities' => $activities]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $query = DB::table('notifications')->where('org_id', $this->orgId($request));
        if ($request->filled('user_email')) {
            $email = $request->query('user_email');
            $query->where(fn ($q) => $q->whereNull('user_email')->orWhere('user_email', $email));
        }
        return response()->json(['notifications' => $this->records($query->latest('created_at')->limit(20)->get())]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $preferences = self::PREFERENCES;
        $userId = (string) $request->query('user_id', '');
        if (!DB::table('users')->where('id', $userId)->where('org_id', $this->orgId($request))->exists()) return response()->json(['preferences' => $preferences]);
        foreach (DB::table('user_preferences')->where('user_id', $userId)->get() as $row) $preferences[$row->preference_key] = (bool) $row->enabled;
        return response()->json(['preferences' => $preferences]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate(['userId' => 'required|string', 'preferences' => 'nullable|array']);
        if (!DB::table('users')->where('id', $data['userId'])->where('org_id', $this->orgId($request))->exists()) return response()->json(['message' => 'User not found'], 404);
        $preferences = array_merge(self::PREFERENCES, $data['preferences'] ?? []);
        foreach ($preferences as $key => $enabled) {
            DB::table('user_preferences')->updateOrInsert(
                ['user_id' => $data['userId'], 'preference_key' => $key],
                ['id' => $this->id('pref-'), 'enabled' => (bool) $enabled, 'updated_at' => now(), 'created_at' => now()],
            );
        }
        return response()->json(['preferences' => $preferences]);
    }

    public function systemSettings(): JsonResponse
    {
        return response()->json(['settings' => $this->settings()]);
    }

    public function updateSystemSettings(Request $request): JsonResponse
    {
        if ($denied = $this->requireAdmin($request)) return $denied;
        $settings = $request->input('settings', []);
        if (isset($settings['session_timeout_minutes'])) $settings['session_timeout_minutes'] = max(15, (int) $settings['session_timeout_minutes']);
        foreach ($settings as $key => $value) {
            DB::table('system_settings')->updateOrInsert(['setting_key' => $key], ['setting_value' => json_encode($value), 'updated_at' => now(), 'created_at' => now()]);
        }
        $this->notify($this->orgId($request), 'System settings updated', 'Workspace configuration was updated', 'system_settings_updated', 'system', null, 'settings');
        return response()->json(['settings' => $this->settings()]);
    }

    public function apiKeys(Request $request): JsonResponse
    {
        $userId = (string) $request->query('user_id', '');
        if (!DB::table('users')->where('id', $userId)->where('org_id', $this->orgId($request))->exists()) return response()->json(['apiKeys' => []]);
        $rows = DB::table('api_keys')->select(['id', 'user_id', 'key_label', 'key_prefix', 'created_at', 'last_used_at', 'revoked_at'])->where('user_id', $userId)->whereNull('revoked_at')->latest('created_at')->get();
        return response()->json(['apiKeys' => $this->records($rows)]);
    }

    public function createApiKey(Request $request): JsonResponse
    {
        $data = $request->validate(['userId' => 'required|string', 'label' => 'nullable|string|max:120']);
        if (!DB::table('users')->where('id', $data['userId'])->where('org_id', $this->orgId($request))->exists()) return response()->json(['message' => 'User not found'], 404);
        $plain = 'bb_live_'.Str::lower(Str::random(24));
        $id = $this->id('key-');
        DB::table('api_keys')->insert(['id' => $id, 'user_id' => $data['userId'], 'key_label' => $data['label'] ?? 'Generated key', 'key_prefix' => substr($plain, 0, 16), 'key_hash' => Hash::make($plain), 'created_at' => now()]);
        $row = DB::table('api_keys')->select(['id', 'user_id', 'key_label', 'key_prefix', 'created_at', 'last_used_at', 'revoked_at'])->find($id);
        return response()->json(['apiKey' => $this->record($row), 'plainKey' => $plain], 201);
    }

    public function revokeApiKey(Request $request, string $id): JsonResponse
    {
        DB::table('api_keys')->where('id', $id)->whereIn('user_id', DB::table('users')->select('id')->where('org_id', $this->orgId($request)))->update(['revoked_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function integrations(): JsonResponse
    {
        return response()->json(['integrations' => $this->records(DB::table('integrations')->orderBy('name')->get())]);
    }

    public function updateIntegration(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:connected,available']);
        DB::table('integrations')->where('id', $id)->update(['status' => $data['status'], 'updated_at' => now()]);
        $row = DB::table('integrations')->find($id);
        if (!$row) return response()->json(['message' => 'Integration not found'], 404);
        $this->notify($this->orgId($request), 'Integration updated', $row->name.' is now '.$row->status, 'integration_updated', 'integration', $id, 'integrations');
        return response()->json(['integration' => $this->record($row)]);
    }

    public function stats(Request $request): JsonResponse
    {
        return response()->json(['stats' => $this->statsFor($this->orgId($request))]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $orgId = $this->orgId($request);
        $days = [];
        for ($i = 6; $i >= 0; $i--) $days[now()->subDays($i)->format('Y-m-d')] = 0;
        $daily = DB::table('bugs')->selectRaw('DATE(created_at) day, COUNT(*) total')->where('org_id', $orgId)->where('created_at', '>=', now()->subDays(6)->startOfDay())->groupByRaw('DATE(created_at)')->get();
        foreach ($daily as $row) if (array_key_exists($row->day, $days)) $days[$row->day] = (int) $row->total;
        $current = DB::table('bugs')->where('org_id', $orgId)->where('created_at', '>=', now()->subDays(7))->count();
        $previous = DB::table('bugs')->where('org_id', $orgId)->whereBetween('created_at', [now()->subDays(14), now()->subDays(7)])->count();
        $activeUsers = DB::table('users')->where('org_id', $orgId)->where('status', 'active')->orderBy('name')->limit(5)->get();
        return response()->json([
            'weeklyBugs' => ['categories' => array_map(fn ($date) => Carbon::parse($date)->format('D'), array_keys($days)), 'data' => array_values($days)],
            'weekDelta' => ['current' => $current, 'previous' => $previous, 'percent' => $previous ? round((($current - $previous) / $previous) * 100) : ($current ? 100 : 0)],
            'activeUsers' => array_map(fn ($row) => $this->publicUser($row), $activeUsers->all()),
            'quickActions' => [
                'openBugs' => DB::table('bugs')->where('org_id', $orgId)->where('status', 'open')->count(),
                'analyticsReports' => DB::table('bugs')->where('org_id', $orgId)->count(),
                'pendingVerification' => DB::table('bugs')->where('org_id', $orgId)->where('status', 'resolved')->whereNull('verified_at')->count(),
                'teamMembers' => DB::table('users')->where('org_id', $orgId)->where('status', 'active')->count(),
            ],
        ]);
    }

    public function reports(Request $request): JsonResponse
    {
        $orgId = $this->orgId($request);
        $priorities = ['critical' => 0, 'high' => 0, 'medium' => 0, 'low' => 0];
        foreach (DB::table('bugs')->selectRaw('priority, COUNT(*) total')->where('org_id', $orgId)->groupBy('priority')->get() as $row) $priorities[$row->priority] = (int) $row->total;
        $totalBugs = DB::table('bugs')->where('org_id', $orgId)->count();
        $totalProjects = DB::table('projects')->where('org_id', $orgId)->count();
        $resolution = DB::table('projects as p')->leftJoin('bugs as b', fn ($join) => $join->on('b.project_id', '=', 'p.id')->on('b.org_id', '=', 'p.org_id'))->where('p.org_id', $orgId)->groupBy('p.id', 'p.name', 'p.created_at')->orderBy('p.created_at')->selectRaw('p.name, COALESCE(AVG(CASE WHEN b.verified_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, b.created_at, b.verified_at) / 86400.0 END), 0) avg_days')->get();
        return response()->json([
            'priorities' => $priorities,
            'summary' => ['totalBugs' => $totalBugs, 'activeProjects' => DB::table('projects')->where('org_id', $orgId)->where('status', 'active')->count(), 'totalProjects' => $totalProjects, 'avgBugsPerProject' => $totalProjects ? round($totalBugs / $totalProjects, 1) : 0],
            'resolutionTimes' => array_map(fn ($row) => ['name' => $row->name, 'days' => round((float) $row->avg_days, 1)], $resolution->all()),
        ]);
    }

    public function export(Request $request): JsonResponse
    {
        if ($denied = $this->requireAdmin($request)) return $denied;
        $orgId = $this->orgId($request);
        return response()->json(['generatedAt' => now()->toDateTimeString(), 'organizationId' => $orgId, 'users' => DB::table('users')->where('org_id', $orgId)->get(), 'projects' => DB::table('projects')->where('org_id', $orgId)->get(), 'sprints' => DB::table('sprints')->where('org_id', $orgId)->get(), 'bugs' => DB::table('bugs')->where('org_id', $orgId)->get(), 'sprintHistory' => DB::table('sprint_bug_history')->where('org_id', $orgId)->get(), 'reports' => ['stats' => $this->statsFor($orgId), 'settings' => $this->settings()]]);
    }

    public function clearData(Request $request): JsonResponse
    {
        if ($denied = $this->requireAdmin($request)) return $denied;
        $target = $request->input('target', 'all');
        $orgId = $this->orgId($request);
        if (in_array($target, ['notifications', 'all'], true)) DB::table('notifications')->where('org_id', $orgId)->delete();
        if (in_array($target, ['activity', 'all'], true)) DB::table('activities')->where('org_id', $orgId)->delete();
        return response()->json(['ok' => true]);
    }

    public function resetDemo(Request $request): JsonResponse
    {
        if ($denied = $this->requireAdmin($request)) return $denied;
        if ($this->orgId($request) !== 'org-deepixel') return response()->json(['message' => 'Demo reset is only available for the default demo organization.'], 403);
        (new DatabaseSeeder())->run();
        return response()->json(['ok' => true]);
    }
}
