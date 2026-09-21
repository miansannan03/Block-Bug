<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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

    private function login(string $email): string
    {
        return $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'password-123'])->assertOk()->json('token');
    }
}
