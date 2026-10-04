<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class SeededBugAuditHistory
{
    /** @return array{created: int, existing: int, skipped: int} */
    public function backfill(?string $organizationId = null, bool $dryRun = false, ?string $connection = null): array
    {
        $db = DB::connection($connection);
        $summary = ['created' => 0, 'existing' => 0, 'skipped' => 0];
        foreach (['activities', 'audit_logs', 'bugs', 'organizations', 'users'] as $table) {
            if (! $db->getSchemaBuilder()->hasTable($table)) {
                return $summary;
            }
        }

        $query = $db->table('activities as activity')
            ->join('bugs as bug', function ($join): void {
                $join->on('bug.id', '=', 'activity.bug_id')->on('bug.org_id', '=', 'activity.org_id');
            })
            ->join('organizations as organization', 'organization.id', '=', 'activity.org_id')
            ->leftJoin('users as actor', function ($join): void {
                $join->on('actor.id', '=', 'activity.user_id')->on('actor.org_id', '=', 'activity.org_id');
            })
            ->whereNull('organization.deleted_at')
            ->select('activity.*', 'actor.role as actor_role')
            ->orderBy('activity.created_at')->orderBy('activity.id');
        if ($organizationId !== null) {
            $query->where('activity.org_id', $organizationId);
        }

        // Dataset seeders use act-<name>-001 or activity-<name>-001.
        // Real requests generate act-<random>; do not manufacture audits for them.
        $activities = $query->get()->filter(fn ($row) => preg_match('/^(?:act|activity)-[a-z0-9-]+-\d+$/i', $row->id));
        foreach ($activities->groupBy('org_id') as $orgId => $rows) {
            $counts = $db->transaction(function () use ($db, $orgId, $rows, $dryRun): array {
                $counts = ['created' => 0, 'existing' => 0, 'skipped' => 0];
                if (! $dryRun) {
                    // Serialize backfills for this organization without changing its records.
                    $db->table('organizations')->where('id', $orgId)->lockForUpdate()->first();
                }
                $linkedActivities = [];
                $legacyEvents = [];
                foreach ($db->table('audit_logs')->where('organization_id', $orgId)->where('entity_type', 'bug')->get() as $audit) {
                    $metadata = json_decode($audit->metadata ?? '{}', true) ?? [];
                    if (isset($metadata['activity_id'])) {
                        $linkedActivities[$metadata['activity_id']] = true;
                    } else {
                        $key = $this->fingerprint($audit->entity_id, $audit->actor_id, $audit->action, $audit->created_at);
                        $legacyEvents[$key] = ($legacyEvents[$key] ?? 0) + 1;
                    }
                }

                foreach ($rows as $activity) {
                    $action = match ($activity->type) {
                        'created' => 'BUG_CREATED',
                        'assigned' => 'BUG_ASSIGNED',
                        'commented' => 'BUG_COMMENTED',
                        'verified' => 'BUG_VERIFIED',
                        'status_changed' => 'BUG_STATUS_CHANGED',
                        default => null,
                    };
                    if ($action === null) {
                        $counts['skipped']++;
                        continue;
                    }
                    if (isset($linkedActivities[$activity->id])) {
                        $counts['existing']++;
                        continue;
                    }
                    $key = $this->fingerprint($activity->bug_id, $activity->user_id, $action, $activity->created_at);
                    if (($legacyEvents[$key] ?? 0) > 0) {
                        // Older seeders recorded some events without an activity ID.
                        $legacyEvents[$key]--;
                        $counts['existing']++;
                        continue;
                    }

                    if (! $dryRun) {
                        $db->table('audit_logs')->insert([
                            'organization_id' => $orgId,
                            'actor_type' => 'user',
                            'actor_id' => $activity->user_id,
                            'actor_role' => $activity->actor_role,
                            'action' => $action,
                            'entity_type' => 'bug',
                            'entity_id' => $activity->bug_id,
                            'succeeded' => true,
                            'metadata' => json_encode([
                                'activity_id' => $activity->id,
                                'message' => $activity->message,
                                'source' => 'seeded_activity_backfill',
                            ], JSON_THROW_ON_ERROR),
                            'ip_address' => null,
                            'request_id' => null,
                            'created_at' => $activity->created_at,
                        ]);
                    }
                    $linkedActivities[$activity->id] = true;
                    $counts['created']++;
                }

                return $counts;
            });
            foreach ($counts as $key => $count) {
                $summary[$key] += $count;
            }
        }

        return $summary;
    }

    private function fingerprint(?string $bugId, ?string $actorId, string $action, string $createdAt): string
    {
        return json_encode([$bugId, $actorId, $action, $createdAt], JSON_THROW_ON_ERROR);
    }
}
