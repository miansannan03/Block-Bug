<?php

namespace Database\Seeders;

use App\Support\BugProofRecorder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BugProofHistorySeeder extends Seeder
{
    public function run(): void
    {
        $this->backfillOrganization();
    }

    public function backfillOrganization(?string $organizationId = null): void
    {
        $recorder = app(BugProofRecorder::class);

        DB::transaction(function () use ($recorder, $organizationId): void {
            $bugs = DB::table('bugs')->orderBy('created_at');
            if ($organizationId !== null) {
                $bugs->where('org_id', $organizationId);
            }

            foreach ($bugs->get() as $bug) {
                $activities = DB::table('activities')
                    ->where('bug_id', $bug->id)
                    ->orderBy('created_at')
                    ->get();

                if (! $activities->contains(fn ($activity) => $activity->type === 'created')) {
                    $recorder->record(
                        $bug->id,
                        'bug_created',
                        $bug->reported_by,
                        ['status' => 'open', 'title' => $bug->title, 'projectId' => $bug->project_id],
                        $bug->created_at,
                        'bug-created:'.$bug->id,
                    );
                }

                $lastRecordedStatus = 'open';
                foreach ($activities as $activity) {
                    $action = match ($activity->type) {
                        'created' => 'bug_created',
                        'assigned' => 'bug_assignment_changed',
                        'commented' => 'bug_commented',
                        'verified' => 'bug_verified',
                        default => str_contains(strtolower($activity->message), 'rejected')
                            ? 'bug_verification_rejected'
                            : 'bug_status_changed',
                    };

                    $status = $this->statusFromActivity($activity->message, $activity->type);
                    if ($status !== null) {
                        $lastRecordedStatus = $status;
                    }

                    $recorder->record(
                        $bug->id,
                        $action,
                        $this->actorEmail($bug->org_id, $activity->user_id),
                        array_filter([
                            'status' => $action === 'bug_created' ? 'open' : null,
                            'toStatus' => $status,
                            'message' => $activity->message,
                            'activityId' => $activity->id,
                        ], fn ($value) => $value !== null),
                        $activity->created_at,
                        'activity:'.$activity->id,
                    );
                }

                if ($bug->status !== $lastRecordedStatus) {
                    $recorder->record(
                        $bug->id,
                        $bug->status === 'closed' ? 'bug_verified' : 'bug_status_changed',
                        $bug->verification_tester_email ?? $bug->assigned_to ?? $bug->reported_by,
                        ['fromStatus' => $lastRecordedStatus, 'toStatus' => $bug->status, 'source' => 'current_bug_state'],
                        $bug->updated_at,
                        'bug-status:'.$bug->id.':'.$bug->status,
                    );
                }
            }
        });
    }

    private function actorEmail(?string $organizationId, string $userId): ?string
    {
        if (filter_var($userId, FILTER_VALIDATE_EMAIL)) {
            return $userId;
        }

        return DB::table('users')
            ->where('org_id', $organizationId)
            ->where('id', $userId)
            ->value('email');
    }

    private function statusFromActivity(string $message, string $type): ?string
    {
        if ($type === 'verified') {
            return 'closed';
        }

        if (preg_match('/(?:status to|to)\s+(open|in-progress|resolved|closed)\b/i', $message, $matches)) {
            return strtolower($matches[1]);
        }

        return null;
    }
}
