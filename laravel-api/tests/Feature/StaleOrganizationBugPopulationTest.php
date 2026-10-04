<?php

namespace Tests\Feature;

use App\Support\BugProofRecorder;
use App\Support\SeededBugAuditHistory;
use App\Support\StaleOrganizationBugPopulation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class StaleOrganizationBugPopulationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-10-04 12:00:00', 'UTC'));
    }

    public function test_population_is_additive_bounded_attributed_and_idempotent(): void
    {
        $this->organization('stale', 2);
        $before = DB::table('bugs')->orderBy('id')->get();
        $population = app(StaleOrganizationBugPopulation::class);
        $plan = $population->plan();
        $this->assertCount(1, $plan);
        $this->assertGreaterThanOrEqual(4, $plan[0]['after']);
        $this->assertLessThan(10, $plan[0]['after']);
        $this->assertDatabaseCount('activities', 0);
        $this->assertSame($plan, $population->populate());
        $this->assertDatabaseCount('bugs', $plan[0]['after']);
        $this->assertEquals($before, DB::table('bugs')->whereIn('id', $before->pluck('id'))->orderBy('id')->get());
        $newBugs = DB::table('bugs')->where('id', 'like', 'bug-sep26-%')->get();
        foreach ($newBugs as $bug) {
            $activities = DB::table('activities')->where('bug_id', $bug->id)->orderBy('created_at')->get();
            $proofs = DB::table('bug_blockchain_events')->where('bug_id', $bug->id)->orderBy('created_at')->get();
            $audits = DB::table('audit_logs')->where('entity_id', $bug->id)->orderBy('created_at')->get();
            $this->assertGreaterThanOrEqual(3, $activities->count());
            $this->assertCount($activities->count(), $proofs);
            $this->assertCount($activities->count(), $audits);
            $this->assertSame('created', $activities->first()->type);
            $this->assertSame('assigned', $activities[1]->type);
            $this->assertNotEmpty($bug->blockchain_last_tx_hash);
            $this->assertSame($proofs->last()->transaction_hash, $bug->blockchain_last_tx_hash);
            $this->assertSame($proofs->last()->created_at, $bug->updated_at);
            foreach ($activities as $index => $activity) {
                $this->assertSame('org-stale', $activity->org_id);
                $this->assertSame($activity->created_at, $proofs[$index]->created_at);
                $this->assertSame($activity->created_at, $audits[$index]->created_at);
                $metadata = json_decode($proofs[$index]->metadata_json, true);
                $this->assertSame($activity->id, $metadata['activity_id']);
                $this->assertTrue($metadata['seeded']);
                $this->assertSame('database', $metadata['proofMode']);
                $this->assertFalse(json_decode($proofs[$index]->service_response, true)['actualBlockchain']);
                $this->assertSame($activity->id, json_decode($audits[$index]->metadata, true)['activity_id']);
                $role = DB::table('users')->where('id', $activity->user_id)->value('role');
                $this->assertSame($role, $audits[$index]->actor_role);
                if (in_array($activity->type, ['created', 'verified'], true) || ($metadata['toStatus'] ?? null) === 'open') {
                    $this->assertSame('tester', $role);
                } elseif ($activity->type === 'status_changed') {
                    $this->assertSame('developer', $role);
                } elseif ($activity->type === 'assigned') {
                    $this->assertContains($role, ['admin', 'manager']);
                }
                $this->assertNull($audits[$index]->ip_address);
                $this->assertGreaterThanOrEqual('2026-09-15 00:00:00', $activity->created_at);
                $this->assertLessThan('2026-10-04 00:00:00', $activity->created_at);
            }
            $last = json_decode($proofs->last()->metadata_json, true);
            $this->assertSame($bug->status, $last['toStatus']);
            $this->assertSame($bug->status === 'closed', $bug->verified_at !== null);
        }
        $counts = [DB::table('bugs')->count(), DB::table('activities')->count(), DB::table('audit_logs')->count(), DB::table('bug_blockchain_events')->count()];
        $this->assertSame([], $population->populate());
        $this->assertSame(0, app(SeededBugAuditHistory::class)->backfill()['created']);
        $this->assertSame($counts, [DB::table('bugs')->count(), DB::table('activities')->count(), DB::table('audit_logs')->count(), DB::table('bug_blockchain_events')->count()]);
    }

    public function test_recent_boundary_deleted_and_inactive_organizations_are_untouched(): void
    {
        $this->organization('recent', 1, '2026-09-16 09:00:00');
        // September 15 midnight Pakistan time is September 14 19:00 UTC.
        $this->organization('boundary', 1, '2026-09-14 19:00:00');
        $this->organization('deleted', 1);
        DB::table('organizations')->where('id', 'org-deleted')->update(['deleted_at' => now()]);
        $this->organization('inactive', 1);
        DB::table('organizations')->where('id', 'org-inactive')->update(['status' => 'inactive']);
        $this->organization('proof-recent', 1);
        app(BugProofRecorder::class)->record('bug-proof-recent-1', 'bug_status_changed', 'proof-recent@example.test', [], '2026-09-16 09:00:00', 'recent-proof');
        $this->assertSame([], app(StaleOrganizationBugPopulation::class)->populate());
        $this->assertDatabaseCount('bugs', 5);
        $this->assertDatabaseCount('activities', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_empty_organization_gets_a_project_and_bugs_but_missing_actor_is_skipped(): void
    {
        $this->organization('empty', 0, project: false);
        $this->organization('no-actor', 0, project: false);
        DB::table('users')->where('org_id', 'org-no-actor')->delete();
        $rows = app(StaleOrganizationBugPopulation::class)->populate();
        $this->assertCount(2, $rows);
        $this->assertGreaterThanOrEqual(4, DB::table('bugs')->where('org_id', 'org-empty')->count());
        $this->assertDatabaseHas('audit_logs', ['organization_id' => 'org-empty', 'action' => 'PROJECT_CREATED']);
        $this->assertSame(0, DB::table('bugs')->where('org_id', 'org-no-actor')->count());
        $this->assertSame(0, DB::table('projects')->where('org_id', 'org-no-actor')->count());
    }

    public function test_existing_nine_or_more_bugs_are_never_removed_or_increased(): void
    {
        $this->organization('nine', 9);
        $this->organization('twelve', 12);
        foreach (app(StaleOrganizationBugPopulation::class)->populate() as $row) {
            $this->assertSame(0, $row['add']);
            $this->assertSame($row['before'], $row['after']);
        }
        $this->assertDatabaseCount('bugs', 21);
        $this->assertDatabaseCount('activities', 0);
    }

    public function test_missing_or_inactive_developer_and_tester_roles_are_skipped(): void
    {
        $this->organization('apxzone', 0, project: false, roles: ['admin']);
        $this->organization('azura', 0, project: false, roles: ['admin', 'manager']);
        $this->organization('no-tester', 0, project: false, roles: ['admin', 'developer']);
        $this->organization('no-developer', 0, project: false, roles: ['admin', 'tester']);
        $this->organization('inactive-tester', 0, project: false);
        $this->organization('inactive-developer', 0, project: false);
        foreach (['inactive-tester' => 'tester', 'inactive-developer' => 'developer'] as $name => $role) {
            DB::table('users')->where('org_id', 'org-'.$name)->where('role', $role)->update(['status' => 'inactive']);
        }
        $usersBefore = DB::table('users')->orderBy('id')->get();
        $rows = app(StaleOrganizationBugPopulation::class)->populate();
        $this->assertCount(6, $rows);
        foreach ($rows as $row) {
            $this->assertSame(0, $row['add']);
            $this->assertStringContainsString('developer and tester are required', $row['skip_reason']);
        }
        foreach (['bugs', 'projects', 'activities', 'bug_blockchain_events', 'audit_logs'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
        $this->assertEquals($usersBefore, DB::table('users')->orderBy('id')->get());
    }

    public function test_missing_assignment_management_role_is_skipped(): void
    {
        $this->organization('no-management', 0, project: false, roles: ['developer', 'tester']);
        $rows = app(StaleOrganizationBugPopulation::class)->populate();
        $this->assertSame(0, $rows[0]['add']);
        $this->assertStringContainsString('administrator or manager is required', $rows[0]['skip_reason']);
        $this->assertDatabaseCount('bugs', 0);
    }

    public function test_failed_proof_rolls_back_the_entire_dataset(): void
    {
        $this->organization('empty', 0, project: false);
        $recorder = Mockery::mock(BugProofRecorder::class);
        $recorder->shouldReceive('record')->once()->andThrow(new RuntimeException('Proof failure'));
        try {
            (new StaleOrganizationBugPopulation($recorder))->populate();
            $this->fail('Expected proof failure.');
        } catch (RuntimeException $e) {
            $this->assertSame('Proof failure', $e->getMessage());
        }
        foreach (['bugs', 'projects', 'activities', 'bug_blockchain_events', 'audit_logs'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_command_defaults_to_preview_and_requires_explicit_apply(): void
    {
        $this->organization('empty', 0, project: false);
        $this->artisan('blockbug:populate-stale-bugs')->assertSuccessful();
        $this->assertDatabaseCount('bugs', 0);
        $this->artisan('blockbug:populate-stale-bugs', ['--apply' => true])->assertSuccessful();
        $this->assertGreaterThanOrEqual(4, DB::table('bugs')->count());
    }

    public function test_production_is_rejected_before_any_writes(): void
    {
        $this->organization('empty', 0, project: false);
        $this->app->instance('env', 'production');
        try {
            app(StaleOrganizationBugPopulation::class)->populate();
            $this->fail('Expected production guard.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('restricted to local/testing', $e->getMessage());
        }
        $this->assertDatabaseCount('bugs', 0);
    }

    private function organization(string $name, int $bugs, string $date = '2026-09-01 10:00:00', bool $project = true, array $roles = ['admin', 'developer', 'tester']): void
    {
        DB::table('organizations')->insert([
            'id' => 'org-'.$name, 'name' => $name, 'login_email' => $name.'@example.test',
            'password_hash' => 'unused', 'status' => 'active', 'created_at' => '2026-08-01 10:00:00', 'updated_at' => $date,
        ]);
        foreach ($roles as $role) {
            DB::table('users')->insert([
                'id' => 'user-'.$name.'-'.$role, 'org_id' => 'org-'.$name, 'name' => $name.' '.$role,
                'email' => $name.'-'.$role.'@example.test', 'password_hash' => 'unused', 'role' => $role,
                'status' => 'active', 'created_at' => $date, 'updated_at' => $date,
            ]);
        }
        if ($project) {
            DB::table('projects')->insert([
                'id' => 'project-'.$name, 'org_id' => 'org-'.$name, 'name' => $name,
                'description' => 'Original project', 'project_key' => 'TEST', 'status' => 'active',
                'created_at' => $date, 'updated_at' => $date,
            ]);
        }
        for ($index = 1; $index <= $bugs; $index++) {
            DB::table('bugs')->insert([
                'id' => 'bug-'.$name.'-'.$index, 'org_id' => 'org-'.$name, 'project_id' => 'project-'.$name,
                'title' => 'Original bug '.$index, 'description' => 'Preserve original bug', 'status' => 'open',
                'priority' => 'medium', 'severity' => 'major', 'reported_by' => $name.'@example.test',
                'created_at' => $date, 'updated_at' => $date,
            ]);
        }
    }
}
