<?php

namespace Tests\Feature;

use App\Support\SeededBugAuditHistory;
use Illuminate\Database\Seeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SeededBugAuditHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['cts', 'turtle'] as $name) {
            DB::table('organizations')->insert([
                'id' => 'org-'.$name, 'name' => $name, 'login_email' => $name.'@example.test',
                'password_hash' => 'unused', 'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('users')->insert([
                'id' => 'user-'.$name, 'org_id' => 'org-'.$name, 'name' => $name,
                'email' => 'tester@'.$name.'.test', 'password_hash' => 'unused', 'role' => 'tester',
                'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('projects')->insert([
                'id' => 'project-'.$name, 'org_id' => 'org-'.$name, 'name' => $name,
                'description' => 'Seeded test project', 'project_key' => strtoupper($name), 'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('bugs')->insert([
                'id' => 'bug-'.$name, 'org_id' => 'org-'.$name, 'project_id' => 'project-'.$name,
                'title' => $name.' bug', 'description' => 'Seeded history test', 'status' => 'closed',
                'priority' => 'medium', 'severity' => 'major', 'reported_by' => 'tester@'.$name.'.test',
                'created_at' => '2026-09-23 10:00:00', 'updated_at' => '2026-09-29 12:00:00',
            ]);
        }
    }

    public function test_backfill_preserves_seeded_history_and_is_idempotent(): void
    {
        $this->createActivities();
        $history = app(SeededBugAuditHistory::class);
        $this->assertSame(['created' => 6, 'existing' => 0, 'skipped' => 0], $history->backfill());
        $this->assertDatabaseHas('audit_logs', [
            'organization_id' => 'org-cts', 'action' => 'BUG_STATUS_CHANGED',
            'actor_id' => 'user-cts', 'actor_role' => 'tester', 'entity_type' => 'bug',
            'entity_id' => 'bug-cts', 'created_at' => '2026-09-28 10:00:00', 'ip_address' => null,
        ]);
        $metadata = json_decode(DB::table('audit_logs')->where('action', 'BUG_STATUS_CHANGED')->value('metadata'), true);
        $this->assertSame('activity-cts-002', $metadata['activity_id']);
        $this->assertSame('Changed status to resolved', $metadata['message']);
        $this->assertSame('seeded_activity_backfill', $metadata['source']);
        $this->assertSame(['created' => 0, 'existing' => 6, 'skipped' => 0], $history->backfill());
        $this->assertDatabaseCount('audit_logs', 6);
        $this->assertDatabaseCount('organizations', 2);
        $this->assertDatabaseCount('bugs', 2);
        $this->assertDatabaseHas('bugs', ['id' => 'bug-cts', 'status' => 'closed', 'updated_at' => '2026-09-29 12:00:00']);
    }

    public function test_backfill_does_not_duplicate_or_modify_linked_or_legacy_audits(): void
    {
        $this->createActivities();
        foreach (['BUG_CREATED' => ['activity-cts-001', '2026-09-23 10:00:00'], 'BUG_ASSIGNED' => [null, '2026-09-26 10:00:00']] as $action => [$activityId, $date]) {
            DB::table('audit_logs')->insert([
                'organization_id' => 'org-cts', 'actor_type' => 'user', 'actor_id' => 'user-cts',
                'actor_role' => 'tester', 'action' => $action, 'entity_type' => 'bug', 'entity_id' => 'bug-cts',
                'succeeded' => true, 'metadata' => $activityId ? json_encode(['activity_id' => $activityId]) : null,
                'created_at' => $date,
            ]);
        }
        $original = DB::table('audit_logs')->orderBy('id')->get()->toArray();
        $this->assertSame(['created' => 4, 'existing' => 2, 'skipped' => 0], app(SeededBugAuditHistory::class)->backfill());
        $this->assertEquals($original, DB::table('audit_logs')->orderBy('id')->limit(2)->get()->toArray());
        $this->assertSame(0, app(SeededBugAuditHistory::class)->backfill()['created']);
        $this->assertDatabaseCount('audit_logs', 6);
    }

    public function test_command_supports_dry_run_and_organization_scope(): void
    {
        $this->createActivities();
        $this->artisan('blockbug:backfill-seeded-audits', ['--organization' => 'org-cts', '--dry-run' => true])
            ->expectsOutput('Would add 5 seeded bug audit events; 0 already exist; 0 unsupported activities skipped.')
            ->assertSuccessful();
        $this->assertDatabaseCount('audit_logs', 0);
        $this->artisan('blockbug:backfill-seeded-audits', ['--organization' => 'org-cts'])->assertSuccessful();
        $this->assertDatabaseCount('audit_logs', 5);
        $this->assertSame(0, DB::table('audit_logs')->where('organization_id', 'org-turtle')->count());
    }

    public function test_live_non_bug_deleted_and_cross_organization_activities_are_excluded(): void
    {
        $this->createActivities();
        DB::table('organizations')->where('id', 'org-turtle')->update(['deleted_at' => now()]);
        DB::table('activities')->insert([
            'id' => 'activity-cts-999', 'org_id' => 'org-cts', 'bug_id' => 'bug-turtle',
            'type' => 'created', 'user_id' => 'user-cts', 'user_name' => 'cts',
            'message' => 'Mismatched organization', 'created_at' => now(),
        ]);
        $summary = app(SeededBugAuditHistory::class)->backfill();
        $this->assertSame(5, $summary['created']);
        $this->assertSame(0, DB::table('audit_logs')->where('organization_id', 'org-turtle')->count());
        $this->assertSame(0, DB::table('audit_logs')->where('entity_id', 'bug-turtle')->count());
        $this->assertDatabaseCount('audit_logs', 5);
    }

    public function test_different_activities_at_the_same_time_are_not_collapsed(): void
    {
        foreach (['001', '002'] as $suffix) {
            DB::table('activities')->insert([
                'id' => 'activity-cts-'.$suffix, 'org_id' => 'org-cts', 'bug_id' => 'bug-cts',
                'type' => 'commented', 'user_id' => 'user-cts', 'user_name' => 'cts',
                'message' => 'Comment '.$suffix, 'created_at' => '2026-09-28 10:00:00',
            ]);
        }
        $this->assertSame(2, app(SeededBugAuditHistory::class)->backfill()['created']);
        $this->assertSame(0, app(SeededBugAuditHistory::class)->backfill()['created']);
        $this->assertDatabaseCount('audit_logs', 2);
    }

    public function test_successful_seeder_runs_automatically_sync_bug_audits(): void
    {
        // Laravel disables command-finished events under PHPUnit by default.
        $kernel = app(\Illuminate\Contracts\Console\Kernel::class);
        $kernel->rerouteSymfonyCommandEvents();
        $kernel->setArtisan(null);
        $this->artisan('db:seed', ['--class' => SeededAuditFixtureSeeder::class])->assertSuccessful();
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'BUG_CREATED', 'entity_id' => 'bug-cts', 'created_at' => '2026-09-23 10:00:00',
        ]);
        $this->artisan('db:seed', ['--class' => SeededAuditFixtureSeeder::class])->assertSuccessful();
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_audit_api_filters_seeded_history_and_keeps_the_platform_total(): void
    {
        $this->createActivities();
        app(SeededBugAuditHistory::class)->backfill();
        foreach (['all' => 5, 'success' => 5, 'failed' => 0] as $result => $count) {
            $request = \Illuminate\Http\Request::create('/api/super-admin/audit-logs', 'GET', [
                'organization_id' => 'org-cts', 'result' => $result,
            ]);
            $this->app->instance('request', $request);
            $response = app(\App\Http\Controllers\SuperAdminController::class)->auditLogs($request)->getData(true);
            $this->assertSame(6, $response['totalAuditEvents']);
            $this->assertSame($count, $response['pagination']['total']);
            $this->assertCount($count, $response['logs']);
            $this->assertCount(2, $response['filters']['organizations']);
            foreach ($response['logs'] as $log) {
                $this->assertSame('org-cts', $log['organizationId']);
                $this->assertSame('seeded_activity_backfill', $log['metadata']['source']);
                $this->assertStringStartsWith('2026-09-', $log['createdAt']);
            }
        }
    }

    public function test_failed_or_unrelated_commands_do_not_sync_audits(): void
    {
        $this->createActivities();
        foreach (['db:seed' => 1, 'migrate' => 0] as $command => $exitCode) {
            \Illuminate\Support\Facades\Event::dispatch(new \Illuminate\Console\Events\CommandFinished(
                $command,
                new \Symfony\Component\Console\Input\ArrayInput([]),
                new \Symfony\Component\Console\Output\BufferedOutput,
                $exitCode,
            ));
        }
        $this->assertDatabaseCount('audit_logs', 0);
    }

    private function createActivities(): void
    {
        foreach ([
            ['001', 'created', 'Created seeded bug', '2026-09-23'],
            ['002', 'status_changed', 'Changed status to resolved', '2026-09-28'],
            ['003', 'verified', 'Verified fix and closed bug', '2026-09-29'],
            ['004', 'assigned', 'Assigned seeded bug', '2026-09-26'],
            ['005', 'commented', 'Commented on seeded bug', '2026-09-25'],
        ] as [$suffix, $type, $message, $date]) {
            DB::table('activities')->insert([
                'id' => 'activity-cts-'.$suffix, 'org_id' => 'org-cts', 'bug_id' => 'bug-cts',
                'type' => $type, 'user_id' => 'user-cts', 'user_name' => 'cts',
                'message' => $message, 'created_at' => $date.' 10:00:00',
            ]);
        }
        foreach ([['act-random12345', 'bug-cts'], ['activity-cts-006', null]] as [$id, $bugId]) {
            DB::table('activities')->insert([
                'id' => $id, 'org_id' => 'org-cts', 'bug_id' => $bugId,
                'type' => 'created', 'user_id' => 'user-cts', 'user_name' => 'cts',
                'message' => 'Not a seeded bug event', 'created_at' => '2026-10-04 10:00:00',
            ]);
        }
        DB::table('activities')->insert([
            'id' => 'act-turtle-001', 'org_id' => 'org-turtle', 'bug_id' => 'bug-turtle',
            'type' => 'created', 'user_id' => 'user-turtle', 'user_name' => 'turtle',
            'message' => 'Created other seeded bug', 'created_at' => '2026-09-30 10:00:00',
        ]);
    }
}

class SeededAuditFixtureSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('activities')->updateOrInsert(['id' => 'activity-cts-001'], [
            'org_id' => 'org-cts', 'bug_id' => 'bug-cts', 'type' => 'created', 'user_id' => 'user-cts',
            'user_name' => 'cts', 'message' => 'Created seeded bug', 'created_at' => '2026-09-23 10:00:00',
        ]);
    }
}
