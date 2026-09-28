<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

abstract class OrganizationDatasetSeeder extends Seeder
{
    /**
     * @return array<string, mixed>
     */
    abstract protected function dataset(): array;

    public function run(): void
    {
        $data = $this->dataset();
        $this->validateDataset($data);

        $organization = $data['organization'];
        $organizationId = $organization['id'];

        DB::transaction(function () use ($data, $organization, $organizationId): void {
            // audit_logs uses nullOnDelete, so remove demo audit rows explicitly when
            // this organization is re-seeded. All other child rows cascade.
            DB::table('audit_logs')->where('organization_id', $organizationId)->delete();
            DB::table('organizations')->where('id', $organizationId)->delete();

            $organizationCreatedAt = $organization['created_at'] ?? now();
            DB::table('organizations')->insert([
                'id' => $organizationId,
                'name' => $organization['name'],
                'login_email' => $organization['login_email'],
                'password_hash' => Hash::make($organization['password']),
                'status' => $organization['status'] ?? 'active',
                'created_at' => $organizationCreatedAt,
                'updated_at' => $organizationCreatedAt,
            ]);

            foreach ($data['users'] as $user) {
                $createdAt = $user['created_at'] ?? $organizationCreatedAt;
                DB::table('users')->insert([
                    'id' => $user['id'],
                    'org_id' => $organizationId,
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'password_hash' => Hash::make($user['password']),
                    'role' => $user['role'],
                    'status' => $user['status'] ?? 'active',
                    'avatar' => $user['avatar'] ?? null,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }

            foreach ($data['projects'] as $project) {
                $createdAt = $project['created_at'] ?? $organizationCreatedAt;
                DB::table('projects')->insert($project + [
                    'org_id' => $organizationId,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }

            foreach ($data['sprints'] as $sprint) {
                $createdAt = $sprint['created_at'] ?? $organizationCreatedAt;
                DB::table('sprints')->insert($sprint + [
                    'org_id' => $organizationId,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }

            foreach ($data['bugs'] as $bug) {
                $createdAt = $bug['created_at'] ?? $organizationCreatedAt;
                DB::table('bugs')->insert($bug + [
                    'org_id' => $organizationId,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }

            foreach ($data['activities'] as $activity) {
                DB::table('activities')->insert($activity + [
                    'org_id' => $organizationId,
                    'created_at' => $activity['created_at'] ?? $organizationCreatedAt,
                ]);
            }

            foreach ($data['comments'] as $comment) {
                DB::table('bug_comments')->insert($comment + [
                    'created_at' => $comment['created_at'] ?? $organizationCreatedAt,
                ]);
            }

            foreach ($data['notifications'] as $notification) {
                DB::table('notifications')->insert($notification + [
                    'org_id' => $organizationId,
                    'is_read' => false,
                    'created_at' => $notification['created_at'] ?? $organizationCreatedAt,
                ]);
            }

            foreach ($data['audit_logs'] as $auditLog) {
                if (isset($auditLog['metadata']) && is_array($auditLog['metadata'])) {
                    $auditLog['metadata'] = json_encode($auditLog['metadata'], JSON_THROW_ON_ERROR);
                }

                DB::table('audit_logs')->insert($auditLog + [
                    'organization_id' => $organizationId,
                    'created_at' => $auditLog['created_at'] ?? $organizationCreatedAt,
                ]);
            }
        });

        app(BugProofHistorySeeder::class)->backfillOrganization($organizationId);
    }

    /**
     * Fail before opening a transaction when a pasted dataset is incomplete or
     * contains references that cannot satisfy the database foreign keys.
     *
     * @param  array<string, mixed>  $data
     */
    private function validateDataset(array $data): void
    {
        $sections = ['organization', 'users', 'projects', 'sprints', 'bugs', 'activities', 'comments', 'notifications', 'audit_logs'];
        foreach ($sections as $section) {
            if (! array_key_exists($section, $data) || ! is_array($data[$section])) {
                throw new InvalidArgumentException("Seeder dataset is missing the {$section} section.");
            }
        }

        foreach (['id', 'name', 'login_email', 'password'] as $field) {
            if (empty($data['organization'][$field])) {
                throw new InvalidArgumentException("Seeder organization is missing {$field}.");
            }
        }

        $this->assertUniqueIds('users', $data['users']);
        $this->assertUniqueIds('projects', $data['projects']);
        $this->assertUniqueIds('sprints', $data['sprints']);
        $this->assertUniqueIds('bugs', $data['bugs']);
        $this->assertUniqueIds('activities', $data['activities']);
        $this->assertUniqueIds('comments', $data['comments']);
        $this->assertUniqueIds('notifications', $data['notifications']);

        $projectIds = array_column($data['projects'], 'id');
        $sprintIds = array_column($data['sprints'], 'id');
        $bugIds = array_column($data['bugs'], 'id');
        $commentIds = array_column($data['comments'], 'id');

        foreach ($data['sprints'] as $sprint) {
            $this->assertReference('sprint project_id', $sprint['project_id'] ?? null, $projectIds);
        }
        foreach ($data['bugs'] as $bug) {
            $this->assertReference('bug project_id', $bug['project_id'] ?? null, $projectIds);
            if (($bug['sprint_id'] ?? null) !== null) {
                $this->assertReference('bug sprint_id', $bug['sprint_id'], $sprintIds);
            }
        }
        foreach ($data['activities'] as $activity) {
            if (($activity['bug_id'] ?? null) !== null) {
                $this->assertReference('activity bug_id', $activity['bug_id'], $bugIds);
            }
        }
        foreach ($data['comments'] as $comment) {
            $this->assertReference('comment bug_id', $comment['bug_id'] ?? null, $bugIds);
            if (($comment['parent_comment_id'] ?? null) !== null) {
                $this->assertReference('comment parent_comment_id', $comment['parent_comment_id'], $commentIds);
            }
        }
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function assertUniqueIds(string $section, array $rows): void
    {
        $ids = array_column($rows, 'id');
        if (count($ids) !== count(array_unique($ids))) {
            throw new InvalidArgumentException("Seeder {$section} contains duplicate or missing IDs.");
        }
    }

    /**
     * @param  list<string>  $validIds
     */
    private function assertReference(string $field, mixed $value, array $validIds): void
    {
        if (! is_string($value) || ! in_array($value, $validIds, true)) {
            throw new InvalidArgumentException("Seeder contains an invalid {$field}: ".var_export($value, true));
        }
    }
}
