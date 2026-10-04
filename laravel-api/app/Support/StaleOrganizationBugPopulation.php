<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/** One-off, additive September 2026 demo history; never run automatically. */
class StaleOrganizationBugPopulation
{
    public const DATASET = 'stale-organizations-september-2026';

    public function __construct(private BugProofRecorder $proofs) {}

    public function plan(): array
    {
        $this->guard();
        $cutoff = CarbonImmutable::parse('2026-09-15 00:00:00', 'Asia/Karachi')->utc()->format('Y-m-d H:i:s');
        $rows = [];
        foreach (DB::table('organizations')->whereNull('deleted_at')->where('status', 'active')->orderBy('name')->get() as $org) {
            // Include report, activity, audit, and proof dates so missing activities
            // cannot accidentally classify an actively used organization as stale.
            $dates = array_filter([
                DB::table('bugs')->where('org_id', $org->id)->max('created_at'),
                DB::table('activities as a')->join('bugs as b', function ($join) {
                    $join->on('b.id', '=', 'a.bug_id')->on('b.org_id', '=', 'a.org_id');
                })->where('a.org_id', $org->id)->max('a.created_at'),
                DB::table('audit_logs as a')->join('bugs as b', function ($join) {
                    $join->on('b.id', '=', 'a.entity_id')->on('b.org_id', '=', 'a.organization_id');
                })->where('a.organization_id', $org->id)->where('a.entity_type', 'bug')->where('a.succeeded', true)->max('a.created_at'),
                DB::table('bug_blockchain_events as p')->join('bugs as b', 'b.id', '=', 'p.bug_id')->where('b.org_id', $org->id)->max('p.created_at'),
            ]);
            $latest = $dates ? max($dates) : null;
            if ($latest !== null && $latest >= $cutoff) {
                continue;
            }
            $count = DB::table('bugs')->where('org_id', $org->id)->count();
            // Reproducibly varied totals (4-9); do not remove any existing bugs.
            $target = max($count + 1, 4 + $this->number($org->id, 'total', 6));
            $reason = $count >= 9 ? 'Already has 9 or more bugs; existing records preserved.' : null;
            $roles = DB::table('users')->where('org_id', $org->id)->where('status', 'active')->pluck('role');
            if (! $roles->contains('developer') || ! $roles->contains('tester')) {
                $reason = 'Active developer and tester are required; no role substitution.';
            } elseif (! $roles->contains('admin') && ! $roles->contains('manager')) {
                $reason = 'An active administrator or manager is required for assignment.';
            }
            if ($org->created_at >= $cutoff) {
                $reason = 'Organization was created after the stale-history cutoff.';
            }
            $rows[] = [
                'id' => $org->id, 'name' => $org->name, 'before' => $count,
                'after' => $reason ? $count : $target, 'add' => $reason ? 0 : $target - $count,
                'last_activity_utc' => $latest, 'skip_reason' => $reason,
            ];
        }

        return $rows;
    }

    public function populate(): array
    {
        $this->guard();

        return DB::transaction(function (): array {
            // Lock organization rows before calculating eligibility and counts.
            DB::table('organizations')->whereNull('deleted_at')->orderBy('id')->lockForUpdate()->get();
            $rows = $this->plan();
            foreach ($rows as $row) {
                if ($row['add'] === 0) {
                    continue;
                }
                $this->populateOrganization($row);
            }

            return $rows;
        });
    }

    private function populateOrganization(array $row): void
    {
        $orgId = $row['id'];
        $key = substr(hash('sha256', self::DATASET.':'.$orgId), 0, 10);
        $users = DB::table('users')->where('org_id', $orgId)->where('status', 'active')->orderBy('id')->lockForUpdate()->get();
        $reporter = $users->firstWhere('role', 'tester');
        $developer = $users->firstWhere('role', 'developer');
        $manager = $users->firstWhere('role', 'manager') ?? $users->firstWhere('role', 'admin');
        if (! $reporter || ! $developer || ! $manager) {
            throw new RuntimeException('Organization team changed; developer, tester, and management roles are required.');
        }
        $base = CarbonImmutable::parse('2026-09-16 09:00:00', 'UTC')->addDays($this->number($orgId, 'date', 8));
        $projects = DB::table('projects')->where('org_id', $orgId)->where('status', 'active')->orderBy('id')->get();
        if ($projects->isEmpty()) {
            $projectId = 'proj-sep26-'.$key;
            DB::table('projects')->insert([
                'id' => $projectId, 'org_id' => $orgId, 'name' => $row['name'].' Operations Portal',
                'description' => 'Demo project for seeded September 2026 bug activity.',
                'project_key' => 'DEMO-'.strtoupper(substr($key, 0, 6)), 'status' => 'active',
                'team_size' => $users->count(), 'created_at' => $base->subHour(), 'updated_at' => $base->subHour(),
            ]);
            $this->audit($orgId, $manager, 'PROJECT_CREATED', 'project', $projectId, $base->subHour(), [
                'message' => 'Created demo operations project for seeded bug history.',
            ]);
            $projects = DB::table('projects')->where('id', $projectId)->get();
        }
        $titles = [
            'Search results keep stale filters after returning from a detail view',
            'CSV export drops records containing multiline notes',
            'Retrying a timed-out submission creates duplicate records',
            'Dashboard totals do not refresh after a record is updated',
            'Date filter uses UTC instead of the selected local timezone',
            'Mobile action menu overlaps the final table row',
            'Saved form values disappear after switching between tabs',
            'Pagination skips records when several rows share a timestamp',
            'Notification link opens the wrong detail view after reassignment',
        ];
        for ($index = 0; $index < $row['add']; $index++) {
            $bugId = 'bug-sep26-'.$key.'-'.sprintf('%02d', $index + 1);
            $project = $projects[$index % $projects->count()];
            $at = $base->addDays($index);
            $title = $titles[($index + $this->number($orgId, 'title', 9)) % count($titles)];
            DB::table('bugs')->insert([
                'id' => $bugId, 'org_id' => $orgId, 'project_id' => $project->id,
                'title' => $title, 'description' => 'Seeded demo report for '.$project->name.'. '.$title.'. Not a live user submission.',
                'status' => 'open', 'priority' => ['medium', 'high', 'low'][$index % 3],
                'severity' => $index % 3 === 2 ? 'minor' : 'major', 'reported_by' => $reporter->email,
                'verification_tester_email' => $reporter->email,
                'steps_to_reproduce' => 'Open '.$project->name.', repeat the affected workflow, and inspect the resulting records.',
                'expected_result' => 'The workflow should retain correct values without missing or duplicate records.',
                'actual_result' => $title, 'environment' => 'Seeded local demo / September 2026',
                'created_at' => $at, 'updated_at' => $at,
            ]);
            $event = 0;
            $this->event($orgId, $bugId, $key, $index, ++$event, $reporter, 'created', 'BUG_CREATED', 'bug_created',
                'Reported demo bug: '.$title, $at, ['title' => $title, 'projectId' => $project->id, 'status' => 'open']);
            $at = $at->addHour();
            DB::table('bugs')->where('id', $bugId)->update(['assigned_to' => $developer->email, 'updated_at' => $at]);
            $this->event($orgId, $bugId, $key, $index, ++$event, $manager, 'assigned', 'BUG_ASSIGNED', 'bug_assignment_changed',
                'Assigned demo bug to '.$developer->name.'.', $at, ['assignedTo' => $developer->email]);
            // Every new bug gets a real recorded transition; some end reopened.
            $final = ['in-progress', 'resolved', 'closed', 'open'][($index + $this->number($orgId, 'status', 4)) % 4];
            $transitions = match ($final) {
                'in-progress' => ['in-progress'],
                'resolved' => ['in-progress', 'resolved'],
                'closed' => ['in-progress', 'resolved', 'closed'],
                'open' => ['in-progress', 'resolved', 'open'],
            };
            $previous = 'open';
            foreach ($transitions as $to) {
                $at = $at->addHours($to === 'in-progress' ? 24 : 12);
                $actor = in_array($to, ['closed', 'open'], true) ? $reporter : $developer;
                DB::table('bugs')->where('id', $bugId)->update([
                    'status' => $to, 'verified_at' => $to === 'closed' ? $at : null, 'updated_at' => $at,
                ]);
                $closed = $to === 'closed';
                $this->event($orgId, $bugId, $key, $index, ++$event, $actor,
                    $closed ? 'verified' : 'status_changed', $closed ? 'BUG_VERIFIED' : 'BUG_STATUS_CHANGED',
                    $closed ? 'bug_verified' : 'bug_status_changed',
                    'Changed status from '.$previous.' to '.$to.($closed ? ' after verifying the demo fix.' : '.'),
                    $at, ['fromStatus' => $previous, 'toStatus' => $to]);
                $previous = $to;
            }
        }
    }

    private function event(string $orgId, string $bugId, string $key, int $index, int $event, object $actor,
        string $type, string $auditAction, string $proofAction, string $message, CarbonImmutable $at, array $metadata): void
    {
        $activityId = 'activity-sep26-'.$key.'-'.sprintf('%03d', $index * 10 + $event);
        DB::table('activities')->insert([
            'id' => $activityId, 'org_id' => $orgId, 'bug_id' => $bugId, 'type' => $type,
            'user_id' => $actor->id, 'user_name' => $actor->name, 'message' => $message, 'created_at' => $at,
        ]);
        $metadata += ['activity_id' => $activityId, 'message' => $message, 'dataset' => self::DATASET, 'seeded' => true];
        $this->proofs->record($bugId, $proofAction, $actor->email, $metadata, $at, $activityId);
        $this->audit($orgId, $actor, $auditAction, 'bug', $bugId, $at, $metadata);
    }

    private function audit(string $orgId, object $actor, string $action, string $entityType, string $entityId, CarbonImmutable $at, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'organization_id' => $orgId, 'actor_type' => 'user', 'actor_id' => $actor->id, 'actor_role' => $actor->role,
            'action' => $action, 'entity_type' => $entityType, 'entity_id' => $entityId, 'succeeded' => true,
            'metadata' => json_encode($metadata + ['source' => 'seeded_bug_population', 'dataset' => self::DATASET, 'seeded' => true], JSON_THROW_ON_ERROR),
            'ip_address' => null, 'request_id' => null, 'created_at' => $at,
        ]);
    }

    private function number(string $orgId, string $purpose, int $modulo): int
    {
        return hexdec(substr(hash('sha256', self::DATASET.':'.$orgId.':'.$purpose), 0, 8)) % $modulo;
    }

    private function guard(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Demo bug population is restricted to local/testing environments.');
        }
        foreach (['organizations', 'users', 'projects', 'bugs', 'activities', 'audit_logs', 'bug_blockchain_events'] as $table) {
            if (! Schema::hasTable($table)) {
                throw new RuntimeException('Missing required table: '.$table);
            }
        }
        if (! Schema::hasColumn('bugs', 'blockchain_last_tx_hash')) {
            throw new RuntimeException('Run the database proof-history migration first.');
        }
        if (CarbonImmutable::now('Asia/Karachi')->lt(CarbonImmutable::parse('2026-10-04', 'Asia/Karachi'))) {
            throw new RuntimeException('This dated demo dataset must not create future activity.');
        }
    }
}
