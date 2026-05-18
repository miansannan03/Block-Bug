<?php

declare(strict_types=1);

function insert_row(PDO $pdo, string $table, array $data): void
{
    $columns = array_keys($data);
    $placeholders = implode(', ', array_fill(0, count($columns), '?'));
    $sql = sprintf(
        'INSERT INTO %s (%s) VALUES (%s)',
        $table,
        implode(', ', $columns),
        $placeholders
    );

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_values($data));
}

function default_organization_seed(PDO $pdo): array
{
    return [
        'id' => 'org-deepixel',
        'name' => 'Deepixel',
        'login_email' => 'deepixel@whatever',
        'password_hash' => password_hash('deepixel123', PASSWORD_DEFAULT),
        'status' => 'active',
    ];
}

function run_seed(PDO $pdo): void
{
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    $pdo->exec('TRUNCATE TABLE api_keys');
    $pdo->exec('TRUNCATE TABLE user_preferences');
    $pdo->exec('TRUNCATE TABLE notifications');
    $pdo->exec('TRUNCATE TABLE bug_comments');
    $pdo->exec('TRUNCATE TABLE integrations');
    $pdo->exec('TRUNCATE TABLE activities');
    $pdo->exec('TRUNCATE TABLE bug_blockchain_events');
    $pdo->exec('TRUNCATE TABLE bugs');
    $pdo->exec('TRUNCATE TABLE projects');
    $pdo->exec('TRUNCATE TABLE users');
    $pdo->exec('TRUNCATE TABLE organizations');
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');

    $organization = default_organization_seed($pdo);
    insert_row($pdo, 'organizations', $organization);

    $password = password_hash('demo123', PASSWORD_DEFAULT);
    $users = [
        ['id' => '1', 'org_id' => $organization['id'], 'name' => 'Alex Chen', 'email' => 'alex@blockbug.dev', 'password_hash' => $password, 'role' => 'admin', 'status' => 'active'],
        ['id' => '2', 'org_id' => $organization['id'], 'name' => 'Nina Park', 'email' => 'nina@blockbug.dev', 'password_hash' => $password, 'role' => 'manager', 'status' => 'active'],
        ['id' => '3', 'org_id' => $organization['id'], 'name' => 'Sarah Dev', 'email' => 'sarah@blockbug.dev', 'password_hash' => $password, 'role' => 'developer', 'status' => 'active'],
        ['id' => '4', 'org_id' => $organization['id'], 'name' => 'Mike Tester', 'email' => 'mike@blockbug.dev', 'password_hash' => $password, 'role' => 'tester', 'status' => 'active'],
    ];

    foreach ($users as $user) {
        insert_row($pdo, 'users', $user);
    }

    $projects = [
        ['id' => 'proj-1', 'org_id' => $organization['id'], 'name' => 'Mobile App', 'description' => 'iOS and Android mobile application', 'project_key' => 'MA', 'status' => 'active', 'team_size' => 8, 'created_at' => '2024-01-15 09:00:00'],
        ['id' => 'proj-2', 'org_id' => $organization['id'], 'name' => 'Web Platform', 'description' => 'Main web application and dashboard', 'project_key' => 'WP', 'status' => 'active', 'team_size' => 12, 'created_at' => '2023-06-20 09:00:00'],
        ['id' => 'proj-3', 'org_id' => $organization['id'], 'name' => 'API Services', 'description' => 'Backend API and microservices', 'project_key' => 'API', 'status' => 'active', 'team_size' => 6, 'created_at' => '2023-11-10 09:00:00'],
    ];

    foreach ($projects as $project) {
        insert_row($pdo, 'projects', $project);
    }

    $bugs = [
        ['id' => 'bug-1', 'org_id' => $organization['id'], 'title' => 'Login button not responsive on mobile', 'description' => 'The login button does not respond to touch events on iOS devices', 'status' => 'open', 'priority' => 'high', 'severity' => 'major', 'project_id' => 'proj-1', 'reported_by' => 'mike@blockbug.dev', 'verification_tester_email' => 'mike@blockbug.dev', 'created_at' => date('Y-m-d H:i:s', strtotime('-2 days')), 'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day'))],
        ['id' => 'bug-2', 'org_id' => $organization['id'], 'title' => 'Crash on app launch in offline mode', 'description' => 'Application crashes immediately when launched without internet connection', 'status' => 'in-progress', 'priority' => 'critical', 'severity' => 'critical', 'project_id' => 'proj-1', 'assigned_to' => 'sarah@blockbug.dev', 'reported_by' => 'mike@blockbug.dev', 'verification_tester_email' => 'mike@blockbug.dev', 'created_at' => date('Y-m-d H:i:s', strtotime('-5 days')), 'updated_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))],
        ['id' => 'bug-3', 'org_id' => $organization['id'], 'title' => 'Dashboard charts not rendering', 'description' => 'Charts on dashboard page show as blank after data load', 'status' => 'resolved', 'priority' => 'medium', 'severity' => 'major', 'project_id' => 'proj-2', 'assigned_to' => 'sarah@blockbug.dev', 'reported_by' => 'alex@blockbug.dev', 'verification_tester_email' => 'mike@blockbug.dev', 'verified_at' => date('Y-m-d H:i:s', strtotime('-1 day')), 'created_at' => date('Y-m-d H:i:s', strtotime('-10 days')), 'updated_at' => date('Y-m-d H:i:s', strtotime('-3 days'))],
        ['id' => 'bug-4', 'org_id' => $organization['id'], 'title' => 'Typo in welcome message', 'description' => 'Welcome message has spelling error in French translation', 'status' => 'closed', 'priority' => 'low', 'severity' => 'minor', 'project_id' => 'proj-2', 'reported_by' => 'mike@blockbug.dev', 'verification_tester_email' => 'mike@blockbug.dev', 'created_at' => date('Y-m-d H:i:s', strtotime('-15 days')), 'updated_at' => date('Y-m-d H:i:s', strtotime('-8 days'))],
        ['id' => 'bug-5', 'org_id' => $organization['id'], 'title' => 'API timeout on large requests', 'description' => 'API endpoint returns 504 timeout for requests with >10000 records', 'status' => 'open', 'priority' => 'high', 'severity' => 'major', 'project_id' => 'proj-3', 'reported_by' => 'sarah@blockbug.dev', 'created_at' => date('Y-m-d H:i:s', strtotime('-3 days')), 'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day'))],
        ['id' => 'bug-6', 'org_id' => $organization['id'], 'title' => 'Database connection pool exhaustion', 'description' => 'Connection pool exhausts under high load, causing request failures', 'status' => 'in-progress', 'priority' => 'critical', 'severity' => 'critical', 'project_id' => 'proj-3', 'assigned_to' => 'sarah@blockbug.dev', 'reported_by' => 'alex@blockbug.dev', 'verification_tester_email' => 'mike@blockbug.dev', 'created_at' => date('Y-m-d H:i:s', strtotime('-7 days')), 'updated_at' => date('Y-m-d H:i:s', strtotime('-4 hours'))],
        ['id' => 'bug-7', 'org_id' => $organization['id'], 'title' => 'Missing validation on user input', 'description' => 'Form accepts invalid email addresses and special characters', 'status' => 'open', 'priority' => 'medium', 'severity' => 'major', 'project_id' => 'proj-2', 'reported_by' => 'mike@blockbug.dev', 'verification_tester_email' => 'mike@blockbug.dev', 'created_at' => date('Y-m-d H:i:s', strtotime('-1 day')), 'updated_at' => date('Y-m-d H:i:s', strtotime('-12 hours'))],
        ['id' => 'bug-8', 'org_id' => $organization['id'], 'title' => 'Performance issue with large file uploads', 'description' => 'Uploading files larger than 100MB causes memory leak', 'status' => 'resolved', 'priority' => 'high', 'severity' => 'major', 'project_id' => 'proj-1', 'assigned_to' => 'sarah@blockbug.dev', 'reported_by' => 'mike@blockbug.dev', 'verification_tester_email' => 'mike@blockbug.dev', 'verified_at' => date('Y-m-d H:i:s', strtotime('-4 days')), 'created_at' => date('Y-m-d H:i:s', strtotime('-20 days')), 'updated_at' => date('Y-m-d H:i:s', strtotime('-6 days'))],
    ];

    foreach ($bugs as $bug) {
        insert_row($pdo, 'bugs', $bug);
    }

    $activities = [
        ['id' => 'act-1', 'org_id' => $organization['id'], 'bug_id' => 'bug-2', 'type' => 'status_changed', 'user_id' => 'sarah@blockbug.dev', 'user_name' => 'Sarah Dev', 'message' => 'Changed status to in-progress', 'created_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))],
        ['id' => 'act-2', 'org_id' => $organization['id'], 'bug_id' => 'bug-2', 'type' => 'assigned', 'user_id' => 'alex@blockbug.dev', 'user_name' => 'Alex Chen', 'message' => 'Assigned to Sarah Dev', 'created_at' => date('Y-m-d H:i:s', strtotime('-3 hours'))],
        ['id' => 'act-3', 'org_id' => $organization['id'], 'bug_id' => 'bug-3', 'type' => 'verified', 'user_id' => 'mike@blockbug.dev', 'user_name' => 'Mike Tester', 'message' => 'Verified fix in v2.1.0', 'created_at' => date('Y-m-d H:i:s', strtotime('-1 day'))],
        ['id' => 'act-4', 'org_id' => $organization['id'], 'bug_id' => 'bug-6', 'type' => 'commented', 'user_id' => 'alex@blockbug.dev', 'user_name' => 'Alex Chen', 'message' => 'Identified root cause: connection timeout settings', 'created_at' => date('Y-m-d H:i:s', strtotime('-4 hours'))],
        ['id' => 'act-5', 'org_id' => $organization['id'], 'bug_id' => 'bug-1', 'type' => 'created', 'user_id' => 'mike@blockbug.dev', 'user_name' => 'Mike Tester', 'message' => 'Created new bug report', 'created_at' => date('Y-m-d H:i:s', strtotime('-2 days'))],
    ];

    foreach ($activities as $activity) {
        insert_row($pdo, 'activities', $activity);
    }

    $comments = [
        ['id' => 'comment-1', 'bug_id' => 'bug-2', 'user_email' => 'sarah@blockbug.dev', 'user_name' => 'Sarah Dev', 'comment' => 'I reproduced this on Android 14 while airplane mode is enabled.', 'created_at' => date('Y-m-d H:i:s', strtotime('-4 hours'))],
        ['id' => 'comment-2', 'bug_id' => 'bug-2', 'user_email' => 'alex@blockbug.dev', 'user_name' => 'Alex Chen', 'comment' => 'Crash logs point to the offline cache initialization path.', 'created_at' => date('Y-m-d H:i:s', strtotime('-3 hours'))],
        ['id' => 'comment-3', 'bug_id' => 'bug-3', 'user_email' => 'mike@blockbug.dev', 'user_name' => 'Mike Tester', 'comment' => 'Verified the chart renders correctly after the latest deploy.', 'created_at' => date('Y-m-d H:i:s', strtotime('-1 day'))],
    ];

    foreach ($comments as $comment) {
        insert_row($pdo, 'bug_comments', $comment);
    }

    $notifications = [
        ['id' => 'notif-1', 'org_id' => $organization['id'], 'user_email' => 'sarah@blockbug.dev', 'title' => 'Critical bug assigned to you', 'body' => 'Crash on app launch in offline mode needs attention.', 'type' => 'assigned', 'is_read' => 0, 'created_at' => date('Y-m-d H:i:s', strtotime('-25 minutes'))],
        ['id' => 'notif-2', 'org_id' => $organization['id'], 'user_email' => null, 'title' => 'New bug reported in Web Platform', 'body' => 'Missing validation on user input was reported.', 'type' => 'created', 'is_read' => 0, 'created_at' => date('Y-m-d H:i:s', strtotime('-12 hours'))],
        ['id' => 'notif-3', 'org_id' => $organization['id'], 'user_email' => 'alex@blockbug.dev', 'title' => 'Fix verified', 'body' => 'Dashboard charts not rendering has been verified.', 'type' => 'verified', 'is_read' => 1, 'created_at' => date('Y-m-d H:i:s', strtotime('-1 day'))],
    ];

    foreach ($notifications as $notification) {
        insert_row($pdo, 'notifications', $notification);
    }

    $preferenceKeys = ['email_notifications', 'bug_assigned', 'comment_notifications', 'daily_digest'];
    foreach ($users as $user) {
        foreach ($preferenceKeys as $index => $key) {
            insert_row($pdo, 'user_preferences', [
                'id' => 'pref-' . $user['id'] . '-' . $key,
                'user_id' => $user['id'],
                'preference_key' => $key,
                'enabled' => $index < 2 ? 1 : 0,
            ]);
        }
    }

    $integrations = [
        ['id' => 'int-slack', 'name' => 'Slack', 'description' => 'Get notifications in Slack when bugs are reported or updated', 'icon' => 'SL', 'status' => 'connected'],
        ['id' => 'int-github', 'name' => 'GitHub', 'description' => 'Link bugs to GitHub issues and sync statuses automatically', 'icon' => 'GH', 'status' => 'connected'],
        ['id' => 'int-jira', 'name' => 'Jira', 'description' => 'Sync BlockBug issues with your Jira projects', 'icon' => 'JI', 'status' => 'available'],
        ['id' => 'int-teams', 'name' => 'Microsoft Teams', 'description' => 'Share bug updates and collaborate with Teams channels', 'icon' => 'MT', 'status' => 'available'],
        ['id' => 'int-gitlab', 'name' => 'GitLab', 'description' => 'Integrate with GitLab issue tracking and CI/CD pipelines', 'icon' => 'GL', 'status' => 'available'],
        ['id' => 'int-webhooks', 'name' => 'Webhooks', 'description' => 'Send bug events to custom systems with webhooks', 'icon' => 'WH', 'status' => 'available'],
    ];

    foreach ($integrations as $integration) {
        insert_row($pdo, 'integrations', $integration);
    }
}
