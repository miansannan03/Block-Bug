<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = 'org-deepixel';

        DB::transaction(function () use ($orgId): void {
            DB::table('organizations')->where('id', $orgId)->delete();
            DB::table('organizations')->insert([
                'id' => $orgId,
                'name' => 'Deepixel',
                'login_email' => 'deepixel@whatever',
                'password_hash' => Hash::make('deepixel123'),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $password = Hash::make('demo123');
            DB::table('users')->insert([
                ['id' => '1', 'org_id' => $orgId, 'name' => 'Alex Chen', 'email' => 'alex@blockbug.dev', 'password_hash' => $password, 'role' => 'admin', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
                ['id' => '2', 'org_id' => $orgId, 'name' => 'Nina Park', 'email' => 'nina@blockbug.dev', 'password_hash' => $password, 'role' => 'manager', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
                ['id' => '3', 'org_id' => $orgId, 'name' => 'Sarah Dev', 'email' => 'sarah@blockbug.dev', 'password_hash' => $password, 'role' => 'developer', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
                ['id' => '4', 'org_id' => $orgId, 'name' => 'Mike Tester', 'email' => 'mike@blockbug.dev', 'password_hash' => $password, 'role' => 'tester', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ]);

            DB::table('projects')->insert([
                ['id' => 'proj-1', 'org_id' => $orgId, 'name' => 'Mobile App', 'description' => 'iOS and Android mobile application', 'project_key' => 'MA', 'status' => 'active', 'team_size' => 8, 'created_at' => now()->subMonths(4), 'updated_at' => now()],
                ['id' => 'proj-2', 'org_id' => $orgId, 'name' => 'Web Platform', 'description' => 'Main web application and dashboard', 'project_key' => 'WP', 'status' => 'active', 'team_size' => 12, 'created_at' => now()->subMonths(8), 'updated_at' => now()],
                ['id' => 'proj-3', 'org_id' => $orgId, 'name' => 'API Services', 'description' => 'Backend API and services', 'project_key' => 'API', 'status' => 'active', 'team_size' => 6, 'created_at' => now()->subMonths(6), 'updated_at' => now()],
            ]);

            $bugs = [
                ['bug-1', 'Login button not responsive on mobile', 'The login button does not respond to touch events on iOS devices', 'open', 'high', 'major', 'proj-1', null, 'mike@blockbug.dev', 2],
                ['bug-2', 'Crash on app launch in offline mode', 'Application crashes immediately when launched without internet connection', 'in-progress', 'critical', 'critical', 'proj-1', 'sarah@blockbug.dev', 'mike@blockbug.dev', 5],
                ['bug-3', 'Dashboard charts not rendering', 'Charts on dashboard show as blank after data load', 'resolved', 'medium', 'major', 'proj-2', 'sarah@blockbug.dev', 'alex@blockbug.dev', 10],
                ['bug-4', 'Typo in welcome message', 'Welcome message has a spelling error', 'closed', 'low', 'minor', 'proj-2', null, 'mike@blockbug.dev', 15],
                ['bug-5', 'API timeout on large requests', 'API endpoint times out for very large requests', 'open', 'high', 'major', 'proj-3', null, 'sarah@blockbug.dev', 3],
                ['bug-6', 'Database connection pool exhaustion', 'Connection pool exhausts under high load', 'in-progress', 'critical', 'critical', 'proj-3', 'sarah@blockbug.dev', 'alex@blockbug.dev', 7],
                ['bug-7', 'Missing validation on user input', 'Form accepts invalid email addresses', 'open', 'medium', 'major', 'proj-2', null, 'mike@blockbug.dev', 1],
                ['bug-8', 'Performance issue with large uploads', 'Large uploads consume too much memory', 'resolved', 'high', 'major', 'proj-1', 'sarah@blockbug.dev', 'mike@blockbug.dev', 20],
            ];
            foreach ($bugs as [$id, $title, $description, $status, $priority, $severity, $project, $assigned, $reporter, $days]) {
                DB::table('bugs')->insert([
                    'id' => $id, 'org_id' => $orgId, 'title' => $title, 'description' => $description,
                    'status' => $status, 'priority' => $priority, 'severity' => $severity, 'project_id' => $project,
                    'assigned_to' => $assigned, 'reported_by' => $reporter, 'verification_tester_email' => 'mike@blockbug.dev',
                    'verified_at' => in_array($status, ['resolved', 'closed'], true) ? now()->subDays(max(1, $days - 2)) : null,
                    'created_at' => now()->subDays($days), 'updated_at' => now()->subHours($days),
                ]);
            }

            DB::table('activities')->insert([
                ['id' => 'act-1', 'org_id' => $orgId, 'bug_id' => 'bug-2', 'type' => 'status_changed', 'user_id' => 'sarah@blockbug.dev', 'user_name' => 'Sarah Dev', 'message' => 'Changed status to in-progress', 'created_at' => now()->subHours(2)],
                ['id' => 'act-2', 'org_id' => $orgId, 'bug_id' => 'bug-3', 'type' => 'verified', 'user_id' => 'mike@blockbug.dev', 'user_name' => 'Mike Tester', 'message' => 'Verified the fix', 'created_at' => now()->subDay()],
            ]);

            DB::table('notifications')->insert([
                ['id' => 'notif-1', 'org_id' => $orgId, 'user_email' => 'sarah@blockbug.dev', 'title' => 'Critical bug assigned to you', 'body' => 'Crash on app launch in offline mode needs attention.', 'type' => 'assigned', 'is_read' => false, 'created_at' => now()->subMinutes(25)],
                ['id' => 'notif-2', 'org_id' => $orgId, 'user_email' => null, 'title' => 'New bug reported in Web Platform', 'body' => 'Missing validation on user input was reported.', 'type' => 'created', 'is_read' => false, 'created_at' => now()->subHours(12)],
            ]);
        });

        $integrations = [
            ['int-slack', 'Slack', 'Get notifications in Slack when bugs are updated', 'SL', 'connected'],
            ['int-github', 'GitHub', 'Link bugs to GitHub issues', 'GH', 'connected'],
            ['int-jira', 'Jira', 'Sync BlockBug issues with Jira projects', 'JI', 'available'],
            ['int-teams', 'Microsoft Teams', 'Share bug updates with Teams channels', 'MT', 'available'],
        ];
        foreach ($integrations as [$id, $name, $description, $icon, $status]) {
            DB::table('integrations')->updateOrInsert(['name' => $name], ['id' => $id, 'description' => $description, 'icon' => $icon, 'status' => $status, 'created_at' => now(), 'updated_at' => now()]);
        }
    }
}
