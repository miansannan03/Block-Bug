<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlatformSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_single_login_routes_platform_and_organization_accounts(): void
    {
        $this->createSuperAdmin();
        $this->createOrganization('org-a', 'Alpha');
        $this->createUser('user-a', 'org-a', 'admin@alpha.test', 'admin');

        $this->postJson('/api/auth/login', ['email' => 'owner@blockbug.test', 'password' => 'password-123'])
            ->assertOk()->assertJsonPath('user.platformRole', 'SUPER_ADMIN')->assertJsonPath('user.organizationId', null)->assertJsonStructure(['token']);

        $this->postJson('/api/auth/login', ['email' => 'admin@alpha.test', 'password' => 'password-123'])
            ->assertOk()->assertJsonPath('user.organizationId', 'org-a')->assertJsonPath('user.organizationRole', 'ORGANIZATION_ADMIN')->assertJsonStructure(['token']);

        $this->postJson('/api/auth/login', ['email' => 'admin@alpha.test', 'password' => 'wrong'])
            ->assertUnauthorized();

        DB::table('organizations')->where('id', 'org-a')->update(['status' => 'inactive']);
        $this->postJson('/api/auth/login', ['email' => 'admin@alpha.test', 'password' => 'password-123'])
            ->assertForbidden()->assertJsonPath('message', 'Your organization is suspended. Contact the BlockBug platform administrator.');
    }

    public function test_tenant_identity_and_role_cannot_be_spoofed_by_headers_or_payload(): void
    {
        $this->createOrganization('org-a', 'Alpha');
        $this->createOrganization('org-b', 'Beta');
        $this->createUser('user-a', 'org-a', 'member@alpha.test', 'tester');
        $this->createUser('admin-a', 'org-a', 'admin@alpha.test', 'admin');
        $this->createUser('admin-b', 'org-b', 'admin@beta.test', 'admin');
        $this->createProject('project-a', 'org-a', 'ALPHA');
        $this->createProject('project-b', 'org-b', 'BETA');
        $this->createBug('bug-b', 'org-b', 'project-b');
        DB::table('bug_attachments')->insert(['id' => 'attachment-b', 'bug_id' => 'bug-b', 'original_name' => 'private.txt', 'stored_name' => 'private.txt', 'file_path' => 'bug-attachments/private.txt', 'mime_type' => 'text/plain', 'file_size' => 7, 'uploaded_by' => 'admin@beta.test', 'created_at' => now()]);

        $memberToken = $this->login('member@alpha.test');
        $adminToken = $this->login('admin@alpha.test');

        $this->withToken($memberToken)->withHeader('X-Organization-Id', 'org-b')
            ->getJson('/api/projects')->assertOk()->assertJsonCount(1, 'projects')->assertJsonPath('projects.0.id', 'project-a');

        $this->withToken($memberToken)->postJson('/api/projects', [
            'name' => 'Spoofed', 'description' => 'No', 'key' => 'NO', 'actorRole' => 'admin',
        ])->assertForbidden();

        $this->withToken($adminToken)->patchJson('/api/bugs/bug-b', ['status' => 'closed'])->assertNotFound();
        $this->withToken($adminToken)->patchJson('/api/users/admin-b', ['status' => 'inactive'])->assertNotFound();
        $this->withToken($adminToken)->get('/api/attachments/attachment-b/download')->assertNotFound();

        $this->withToken($adminToken)->patchJson('/api/system-settings', ['settings' => ['app_name' => 'Alpha Bug']])->assertOk();
        $betaToken = $this->login('admin@beta.test');
        $this->withToken($betaToken)->getJson('/api/system-settings')->assertOk()->assertJsonPath('settings.app_name', 'BlockBug');
    }

    public function test_secure_organization_invitation_is_hashed_expiring_and_single_use(): void
    {
        $this->createSuperAdmin();
        $token = $this->login('owner@blockbug.test');

        $response = $this->withToken($token)->postJson('/api/super-admin/invitations', ['email' => 'first@newco.test'])
            ->assertCreated()->assertJsonPath('invitation.role', 'admin');
        $plain = $response->json('token');
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{24}$/', $plain);
        $this->assertNotSame($plain, DB::table('invitations')->value('token_hash'));
        $this->assertSame(hash('sha256', $plain), DB::table('invitations')->value('token_hash'));

        $this->postJson('/api/invitations/inspect', ['token' => $plain])->assertOk()->assertJsonPath('invitation.email', 'first@newco.test');
        $this->postJson('/api/invitations/accept', [
            'token' => $plain, 'name' => 'First Admin', 'organizationName' => 'New Company', 'password' => 'secure-pass-123', 'password_confirmation' => 'secure-pass-123',
        ])->assertOk();
        $this->postJson('/api/invitations/accept', [
            'token' => $plain, 'name' => 'Again', 'organizationName' => 'Again', 'password' => 'secure-pass-123', 'password_confirmation' => 'secure-pass-123',
        ])->assertStatus(410);

        $user = DB::table('users')->where('email', 'first@newco.test')->first();
        $this->assertSame('admin', $user->role);
        $this->assertNotNull($user->org_id);
        $this->assertSame('accepted', DB::table('invitations')->value('status'));

        $this->postJson('/api/invitations/inspect', ['token' => 'not-a-real-token'])->assertNotFound();

        $expired = $this->withToken($token)->postJson('/api/super-admin/invitations', ['email' => 'expired@newco.test'])->assertCreated()->json('token');
        DB::table('invitations')->where('email', 'expired@newco.test')->update(['expires_at' => now()->subMinute()]);
        $this->postJson('/api/invitations/inspect', ['token' => $expired])->assertStatus(410)->assertJsonPath('message', 'This invitation has expired.');

        $revokedResponse = $this->withToken($token)->postJson('/api/super-admin/invitations', ['email' => 'revoked@newco.test'])->assertCreated();
        $this->withToken($token)->postJson('/api/super-admin/invitations/'.$revokedResponse->json('invitation.id').'/revoke')->assertOk();
        $this->postJson('/api/invitations/inspect', ['token' => $revokedResponse->json('token')])->assertStatus(410);
    }

    public function test_organization_admin_can_invite_admin_but_never_super_admin(): void
    {
        $this->createOrganization('org-a', 'Alpha');
        $this->createUser('admin-a', 'org-a', 'admin@alpha.test', 'admin');
        $token = $this->login('admin@alpha.test');

        $response = $this->withToken($token)->postJson('/api/user-invitations', ['email' => 'second@alpha.test', 'role' => 'admin'])
            ->assertCreated()->assertJsonPath('invitation.organizationId', 'org-a');
        $plain = $response->json('token');
        $this->postJson('/api/invitations/accept', [
            'token' => $plain, 'name' => 'Second Admin', 'password' => 'secure-pass-123', 'password_confirmation' => 'secure-pass-123',
        ])->assertOk();
        $this->assertDatabaseHas('users', ['email' => 'second@alpha.test', 'org_id' => 'org-a', 'role' => 'admin']);

        $this->withToken($token)->postJson('/api/user-invitations', ['email' => 'bad@alpha.test', 'role' => 'super_admin'])
            ->assertUnprocessable();
    }

    public function test_comment_can_include_a_downloadable_proof_attachment(): void
    {
        Storage::fake('local');
        $this->createOrganization('org-a', 'Alpha');
        $this->createUser('admin-a', 'org-a', 'admin@alpha.test', 'admin');
        $this->createProject('project-a', 'org-a', 'ALPHA');
        $this->createBug('bug-a', 'org-a', 'project-a');
        $token = $this->login('admin@alpha.test');

        $response = $this->withToken($token)->post('/api/bugs/bug-a/comments', [
            'comment' => 'The fix is confirmed by the attached proof.',
            'attachment' => UploadedFile::fake()->create('proof.txt', 2, 'text/plain'),
        ])->assertCreated()
            ->assertJsonPath('comment.comment', 'The fix is confirmed by the attached proof.')
            ->assertJsonPath('comment.attachment.originalName', 'proof.txt');

        $commentId = $response->json('comment.id');
        $attachment = DB::table('bug_attachments')->where('comment_id', $commentId)->first();
        $this->assertNotNull($attachment);
        Storage::disk('local')->assertExists($attachment->file_path);

        $this->withToken($token)->getJson('/api/bugs/bug-a/comments')
            ->assertOk()
            ->assertJsonPath('comments.0.attachment.originalName', 'proof.txt');
        $this->withToken($token)->getJson('/api/bugs/bug-a/attachments')
            ->assertOk()
            ->assertJsonCount(0, 'attachments');
        $this->withToken($token)->get('/api/attachments/'.$attachment->id.'/download')->assertOk();
    }

    public function test_only_admins_and_managers_can_move_bugs_to_open_sprints(): void
    {
        $this->createOrganization('org-a', 'Alpha');
        $this->createUser('admin-a', 'org-a', 'admin@alpha.test', 'admin');
        $this->createUser('manager-a', 'org-a', 'manager@alpha.test', 'manager');
        $this->createUser('tester-a', 'org-a', 'tester@alpha.test', 'tester');
        $this->createProject('project-a', 'org-a', 'ALPHA');
        $this->createBug('bug-a', 'org-a', 'project-a');
        $this->createBug('bug-b', 'org-a', 'project-a');
        $this->createBug('bug-c', 'org-a', 'project-a');
        $this->createSprint('sprint-active', 'org-a', 'project-a', 'active');
        $this->createSprint('sprint-completed', 'org-a', 'project-a', 'completed');

        $this->withToken($this->login('admin@alpha.test'))
            ->patchJson('/api/bugs/bug-a', ['sprintId' => 'sprint-active'])
            ->assertOk()
            ->assertJsonPath('bug.sprintId', 'sprint-active');
        $this->withToken($this->login('manager@alpha.test'))
            ->patchJson('/api/bugs/bug-b', ['sprintId' => 'sprint-active'])
            ->assertOk()
            ->assertJsonPath('bug.sprintId', 'sprint-active');
        $this->withToken($this->login('tester@alpha.test'))
            ->patchJson('/api/bugs/bug-c', ['sprintId' => 'sprint-active'])
            ->assertForbidden();
        $this->withToken($this->login('admin@alpha.test'))
            ->patchJson('/api/bugs/bug-c', ['sprintId' => 'sprint-completed'])
            ->assertUnprocessable();

        $this->assertDatabaseHas('sprint_bug_history', [
            'bug_id' => 'bug-a',
            'from_sprint_id' => null,
            'to_sprint_id' => 'sprint-active',
            'reason' => 'manual_sprint_change',
        ]);
    }

    public function test_super_admin_can_manage_organizations_and_view_aggregate_logs(): void
    {
        $this->createSuperAdmin();
        $this->createOrganization('org-a', 'Alpha');
        $this->createUser('admin-a', 'org-a', 'admin@alpha.test', 'admin');
        $token = $this->login('owner@blockbug.test');

        $this->withToken($token)->getJson('/api/super-admin/dashboard')->assertOk()->assertJsonPath('metrics.totalOrganizations', 1)->assertJsonPath('metrics.totalAdmins', 1);
        $this->withToken($token)->patchJson('/api/super-admin/organizations/org-a', ['status' => 'inactive'])->assertOk()->assertJsonPath('organization.status', 'inactive');
        $this->postJson('/api/auth/login', ['email' => 'admin@alpha.test', 'password' => 'password-123'])->assertForbidden();
        $this->withToken($token)->patchJson('/api/super-admin/organizations/org-a', ['status' => 'active'])->assertOk();
        $this->withToken($token)->getJson('/api/super-admin/audit-logs')->assertOk()->assertJsonFragment(['action' => 'ORGANIZATION_ACTIVATED']);
        $this->withToken($token)->getJson('/api/super-admin/error-logs')->assertOk();
    }

    public function test_platform_audit_total_is_not_limited_by_recent_activity_pagination_or_filters(): void
    {
        $this->createSuperAdmin();
        $token = $this->login('owner@blockbug.test');
        $initialTotal = DB::table('audit_logs')->count();

        for ($index = 0; $index < 30; $index++) {
            DB::table('audit_logs')->insert([
                'action' => 'AUDIT_COUNT_TEST',
                'succeeded' => $index % 3 !== 0,
                'created_at' => now(),
            ]);
        }

        $total = $initialTotal + 30;
        $this->withToken($token)->getJson('/api/super-admin/dashboard')
            ->assertOk()->assertJsonPath('metrics.totalAuditEvents', $total)
            ->assertJsonCount(10, 'recentActivity');
        $this->withToken($token)->getJson('/api/super-admin/audit-logs')
            ->assertOk()->assertJsonPath('totalAuditEvents', $total)
            ->assertJsonPath('pagination.total', $total)->assertJsonCount(25, 'logs');
        $this->withToken($token)->getJson('/api/super-admin/audit-logs?page=2')
            ->assertOk()->assertJsonPath('totalAuditEvents', $total)
            ->assertJsonCount($total - 25, 'logs');

        foreach (['success' => true, 'failed' => false] as $result => $succeeded) {
            $filteredTotal = DB::table('audit_logs')->where('succeeded', $succeeded)->count();
            $this->withToken($token)->getJson('/api/super-admin/audit-logs?result='.$result)
                ->assertOk()->assertJsonPath('totalAuditEvents', $total)
                ->assertJsonPath('pagination.total', $filteredTotal);
        }

        DB::table('audit_logs')->insert(['action' => 'NEW_AUDIT_EVENT', 'succeeded' => true, 'created_at' => now()]);
        $this->withToken($token)->getJson('/api/super-admin/dashboard')
            ->assertOk()->assertJsonPath('metrics.totalAuditEvents', $total + 1);
        $this->withToken($token)->getJson('/api/super-admin/audit-logs?result=failed')
            ->assertOk()->assertJsonPath('totalAuditEvents', $total + 1);
    }

    public function test_platform_dashboard_reports_zero_for_an_empty_audit_log(): void
    {
        $response = app(\App\Http\Controllers\SuperAdminController::class)->dashboard();

        $this->assertSame(0, $response->getData(true)['metrics']['totalAuditEvents']);
        $this->assertSame([], $response->getData(true)['recentActivity']);
    }

    public function test_platform_organizations_are_paginated_without_duplicate_rows_and_clamp_after_deletions(): void
    {
        $this->createSuperAdmin();
        $token = $this->login('owner@blockbug.test');
        for ($index = 0; $index < 27; $index++) {
            $id = 'org-'.str_pad((string) $index, 2, '0', STR_PAD_LEFT);
            $this->createOrganization($id, $id);
        }
        $this->createOrganization('org-deleted', 'Deleted');
        DB::table('organizations')->where('id', 'org-deleted')->update(['deleted_at' => now()]);
        $this->createUser('admin-a', 'org-26', 'a@alpha.test', 'admin');
        $this->createUser('admin-b', 'org-26', 'b@alpha.test', 'admin');

        $first = $this->withToken($token)->getJson('/api/super-admin/organizations')
            ->assertOk()->assertJsonCount(25, 'organizations')
            ->assertJsonPath('pagination.total', 27)->assertJsonPath('pagination.perPage', 25)
            ->assertJsonPath('pagination.currentPage', 1)->assertJsonPath('pagination.lastPage', 2)
            ->assertJsonPath('pagination.hasNextPage', true)->assertJsonPath('pagination.hasPreviousPage', false)
            ->assertJsonPath('organizations.0.id', 'org-26')->assertJsonPath('organizations.0.userCount', 2);
        $second = $this->withToken($token)->getJson('/api/super-admin/organizations?page=2')
            ->assertOk()->assertJsonCount(2, 'organizations')->assertJsonPath('pagination.currentPage', 2)
            ->assertJsonPath('pagination.hasNextPage', false)->assertJsonPath('pagination.hasPreviousPage', true);
        $this->assertSame([], array_intersect(array_column($first->json('organizations'), 'id'), array_column($second->json('organizations'), 'id')));
        $this->withToken($token)->getJson('/api/super-admin/organizations?page=999')
            ->assertOk()->assertJsonPath('pagination.currentPage', 2)->assertJsonCount(2, 'organizations');

        DB::table('organizations')->whereIn('id', ['org-00', 'org-01'])->update(['deleted_at' => now()]);
        $this->withToken($token)->getJson('/api/super-admin/organizations?page=2')
            ->assertOk()->assertJsonPath('pagination.currentPage', 1)
            ->assertJsonPath('pagination.lastPage', 1)->assertJsonPath('pagination.total', 25)
            ->assertJsonCount(25, 'organizations');
    }

    public function test_platform_invitations_are_paginated_and_exclude_user_invitations(): void
    {
        $this->createSuperAdmin();
        $token = $this->login('owner@blockbug.test');
        for ($index = 0; $index < 28; $index++) {
            DB::table('invitations')->insert([
                'id' => 'invite-'.str_pad((string) $index, 2, '0', STR_PAD_LEFT),
                'type' => $index === 27 ? 'user' : 'organization',
                'email' => 'invite-'.$index.'@example.test',
                'role' => 'admin',
                'token_hash' => hash('sha256', 'test-token-'.$index),
                'status' => $index % 2 === 0 ? 'pending' : 'revoked',
                'created_by_type' => 'platform_admin',
                'created_by_id' => 'sa-1',
                'expires_at' => now()->addWeek(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $first = $this->withToken($token)->getJson('/api/super-admin/invitations')
            ->assertOk()->assertJsonCount(25, 'invitations')->assertJsonPath('invitations.0.id', 'invite-26')
            ->assertJsonPath('pagination.total', 27)->assertJsonPath('pagination.perPage', 25)
            ->assertJsonPath('pagination.currentPage', 1)->assertJsonPath('pagination.lastPage', 2)
            ->assertJsonPath('pagination.hasNextPage', true)->assertJsonPath('pagination.hasPreviousPage', false);
        $second = $this->withToken($token)->getJson('/api/super-admin/invitations?page=2')
            ->assertOk()->assertJsonCount(2, 'invitations')->assertJsonPath('pagination.currentPage', 2)
            ->assertJsonPath('pagination.hasNextPage', false)->assertJsonPath('pagination.hasPreviousPage', true);
        $this->assertSame([], array_intersect(array_column($first->json('invitations'), 'id'), array_column($second->json('invitations'), 'id')));
        $this->withToken($token)->getJson('/api/super-admin/invitations?page=999')
            ->assertOk()->assertJsonPath('pagination.currentPage', 2)->assertJsonCount(2, 'invitations');
    }

    public function test_platform_table_pagination_handles_empty_lists_and_rejects_invalid_pages(): void
    {
        $this->createSuperAdmin();
        $token = $this->login('owner@blockbug.test');
        foreach (['organizations', 'invitations'] as $table) {
            $this->withToken($token)->getJson('/api/super-admin/'.$table.'?page=2')
                ->assertOk()->assertJsonCount(0, $table)->assertJsonPath('pagination.total', 0)
                ->assertJsonPath('pagination.currentPage', 1)->assertJsonPath('pagination.lastPage', 1)
                ->assertJsonPath('pagination.hasNextPage', false)->assertJsonPath('pagination.hasPreviousPage', false);
            foreach (['0', '-1', 'invalid'] as $page) {
                $this->withToken($token)->getJson('/api/super-admin/'.$table.'?page='.$page)
                    ->assertUnprocessable()->assertJsonValidationErrors('page');
            }
        }
    }

    public function test_deployment_can_seed_super_admin_from_a_protected_credentials_file_once(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'blockbug-admin-');
        try {
            file_put_contents($path, json_encode([
                'email' => 'deployer@blockbug.test',
                'password' => 'deployment-pass-123',
                'name' => 'Deployment Owner',
            ], JSON_THROW_ON_ERROR));

            $this->artisan('blockbug:create-super-admin', ['--credentials-file' => $path, '--if-missing' => true])
                ->assertSuccessful();
            $admin = DB::table('platform_admins')->where('email', 'deployer@blockbug.test')->first();
            $this->assertSame('Deployment Owner', $admin->name);
            $this->assertTrue(Hash::check('deployment-pass-123', $admin->password_hash));

            file_put_contents($path, json_encode([
                'email' => 'deployer@blockbug.test',
                'password' => 'replacement-pass-456',
                'name' => 'Changed Name',
            ], JSON_THROW_ON_ERROR));
            $this->artisan('blockbug:create-super-admin', ['--credentials-file' => $path, '--if-missing' => true])
                ->assertSuccessful();
            $this->assertTrue(Hash::check('deployment-pass-123', DB::table('platform_admins')->where('email', 'deployer@blockbug.test')->value('password_hash')));
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }

    private function createSuperAdmin(): void
    {
        DB::table('platform_admins')->insert(['id' => 'sa-1', 'name' => 'Owner', 'email' => 'owner@blockbug.test', 'password_hash' => Hash::make('password-123'), 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
    }

    private function createOrganization(string $id, string $name): void
    {
        DB::table('organizations')->insert(['id' => $id, 'name' => $name, 'login_email' => $id.'@legacy.test', 'password_hash' => Hash::make('unused-password'), 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
    }

    private function createUser(string $id, string $org, string $email, string $role): void
    {
        DB::table('users')->insert(['id' => $id, 'org_id' => $org, 'name' => $id, 'email' => $email, 'password_hash' => Hash::make('password-123'), 'role' => $role, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
    }

    private function createProject(string $id, string $org, string $key): void
    {
        DB::table('projects')->insert(['id' => $id, 'org_id' => $org, 'name' => $key, 'description' => $key, 'project_key' => $key, 'status' => 'active', 'team_size' => 1, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function createBug(string $id, string $org, string $project): void
    {
        DB::table('bugs')->insert(['id' => $id, 'org_id' => $org, 'title' => 'Private bug', 'description' => 'Private', 'status' => 'open', 'priority' => 'high', 'severity' => 'major', 'project_id' => $project, 'reported_by' => 'admin@beta.test', 'created_at' => now(), 'updated_at' => now()]);
    }

    private function createSprint(string $id, string $org, string $project, string $status): void
    {
        DB::table('sprints')->insert([
            'id' => $id,
            'org_id' => $org,
            'project_id' => $project,
            'name' => $id,
            'status' => $status,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function login(string $email): string
    {
        return $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'password-123'])->assertOk()->json('token');
    }
}
