<?php

declare(strict_types=1);

require __DIR__ . '/../config.php';
require __DIR__ . '/../database/seed_data.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function public_user(array $user): array
{
    unset($user['password_hash']);
    return camelize_record($user);
}

function project_record(array $project): array
{
    $project = camelize_record($project);
    $project['key'] = $project['projectKey'] ?? '';
    unset($project['projectKey']);
    return $project;
}

function bug_record(array $bug): array
{
    return camelize_record($bug);
}

function activity_record(array $activity): array
{
    $activity = camelize_record($activity);
    $activity['timestamp'] = $activity['createdAt'];
    return $activity;
}

function comment_record(array $comment): array
{
    $comment = camelize_record($comment);
    $comment['createdAt'] = $comment['createdAt'] ?? $comment['created_at'] ?? null;
    return $comment;
}

function notification_record(array $notification): array
{
    return camelize_record($notification);
}

function create_notification(
    PDO $pdo,
    ?string $userEmail,
    string $title,
    string $body,
    string $type,
    ?string $entityType = null,
    ?string $entityId = null,
    ?string $targetPage = null
): void
{
    $notification = $pdo->prepare(
        'INSERT INTO notifications (id, user_email, title, body, type, entity_type, entity_id, target_page) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $notification->execute(['notif-' . bin2hex(random_bytes(6)), $userEmail, $title, $body, $type, $entityType, $entityId, $targetPage]);
}

function create_global_notification(
    PDO $pdo,
    string $title,
    string $body,
    string $type,
    ?string $entityType = null,
    ?string $entityId = null,
    ?string $targetPage = null
): void
{
    create_notification($pdo, null, $title, $body, $type, $entityType, $entityId, $targetPage);
}

function notification_bug_label(array $bug): string
{
    $bugId = $bug['id'] ?? '';
    $shortId = $bugId !== '' ? strtoupper(substr($bugId, 0, 8)) : 'UNKNOWN';
    return $shortId . ' - ' . ($bug['title'] ?? 'Untitled bug');
}

function notification_project_label(array $project): string
{
    $projectKey = strtoupper((string) ($project['project_key'] ?? 'PROJ'));
    return $projectKey . ' - ' . ($project['name'] ?? 'Untitled project');
}

function notification_text_preview(string $text, int $limit = 90): string
{
    $text = trim(preg_replace('/\s+/', ' ', $text) ?? '');
    if ($text === '') {
        return '';
    }

    if (strlen($text) <= $limit) {
        return $text;
    }

    return rtrim(substr($text, 0, $limit - 3)) . '...';
}

function api_key_record(array $key): array
{
    return camelize_record($key);
}

function integration_record(array $integration): array
{
    return camelize_record($integration);
}

function role_definitions(): array
{
    return [
        'admin' => [
            'label' => 'Administrator',
            'description' => 'Full system access with user management and settings control.',
            'permissions' => ['Full system access', 'Manage users', 'Configure settings'],
        ],
        'manager' => [
            'label' => 'Manager',
            'description' => 'Reviews bug pipelines, assigns work, and monitors reporting.',
            'permissions' => ['Review pipelines', 'Assign bugs', 'View reports'],
        ],
        'developer' => [
            'label' => 'Developer',
            'description' => 'Fixes assigned bugs and keeps reports updated through the workflow.',
            'permissions' => ['Fix bugs', 'Comment on bug reports', 'Update bug status'],
        ],
        'tester' => [
            'label' => 'Tester',
            'description' => 'Reports bugs, tracks submitted reports, and verifies completed fixes.',
            'permissions' => ['Report bugs', 'Track their reports', 'Verify fixes'],
        ],
    ];
}

function default_system_settings(): array
{
    return [
        'default_bug_status' => 'open',
        'default_bug_priority' => 'medium',
        'default_bug_severity' => 'major',
        'default_assignee_rule' => 'unassigned',
        'app_name' => 'BlockBug',
        'timezone' => 'Asia/Karachi',
        'date_format' => 'Y-m-d',
        'dashboard_default_view' => 'overview',
        'session_timeout_minutes' => 120,
        'allow_signup' => true,
    ];
}

function system_settings(PDO $pdo): array
{
    $settings = default_system_settings();
    $rows = $pdo->query('SELECT setting_key, setting_value FROM system_settings')->fetchAll();
    foreach ($rows as $row) {
        $decoded = json_decode($row['setting_value'], true);
        $settings[$row['setting_key']] = $decoded === null && $row['setting_value'] !== 'null'
            ? $row['setting_value']
            : $decoded;
    }

    return $settings;
}

function bug_stats(PDO $pdo): array
{
    $rows = $pdo->query('SELECT status, priority, COUNT(*) AS total FROM bugs GROUP BY status, priority')->fetchAll();
    $stats = ['total' => 0, 'open' => 0, 'inProgress' => 0, 'resolved' => 0, 'closed' => 0, 'critical' => 0, 'high' => 0];

    foreach ($rows as $row) {
        $count = (int) $row['total'];
        $stats['total'] += $count;
        if ($row['status'] === 'in-progress') {
            $stats['inProgress'] += $count;
        } elseif (isset($stats[$row['status']])) {
            $stats[$row['status']] += $count;
        }
        if ($row['priority'] === 'critical') {
            $stats['critical'] += $count;
        }
        if ($row['priority'] === 'high') {
            $stats['high'] += $count;
        }
    }

    return $stats;
}

function resolve_default_assignee(PDO $pdo, string $rule, string $reportedBy): ?string
{
    if ($rule === 'reporter') {
        return $reportedBy;
    }

    if ($rule === 'project-lead') {
        $stmt = $pdo->query("SELECT email FROM users WHERE status = 'active' AND role IN ('manager', 'admin') ORDER BY FIELD(role, 'manager', 'admin'), name LIMIT 1");
        $email = $stmt->fetchColumn();
        return $email !== false ? (string) $email : null;
    }

    return null;
}

function preferences_for_user_email(PDO $pdo, string $email): array
{
    $defaults = [
        'email_notifications' => true,
        'bug_assigned' => true,
        'comment_notifications' => true,
        'daily_digest' => true,
    ];

    $userStmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $userStmt->execute([$email]);
    $userId = $userStmt->fetchColumn();
    if ($userId === false) {
        return $defaults;
    }

    $prefStmt = $pdo->prepare('SELECT preference_key, enabled FROM user_preferences WHERE user_id = ?');
    $prefStmt->execute([$userId]);
    foreach ($prefStmt->fetchAll() as $row) {
        $defaults[$row['preference_key']] = (bool) $row['enabled'];
    }

    return $defaults;
}

function should_include_notification_for_preferences(array $notification, array $preferences): bool
{
    $type = $notification['type'] ?? '';
    $alwaysVisibleTypes = ['user_login', 'password_changed', 'api_key_created', 'api_key_revoked', 'user_created', 'user_updated'];

    if ($type === 'preferences_updated') {
        return false;
    }

    if (in_array($type, $alwaysVisibleTypes, true)) {
        return true;
    }

    if (($preferences['bug_assigned'] ?? true) === false && $type === 'bug_assigned') {
        return false;
    }

    if (($preferences['comment_notifications'] ?? true) === false && $type === 'comment_added') {
        return false;
    }

    if (($preferences['daily_digest'] ?? true) === false && $type === 'daily_digest') {
        return false;
    }

    return true;
}

function build_daily_digest_notification(PDO $pdo, string $email): ?array
{
    $userStmt = $pdo->prepare('SELECT id, name FROM users WHERE email = ? LIMIT 1');
    $userStmt->execute([$email]);
    $user = $userStmt->fetch();
    if (!$user) {
        return null;
    }

    $since = (new DateTimeImmutable('-1 day'))->format('Y-m-d H:i:s');

    $activityStmt = $pdo->prepare(
        'SELECT
            SUM(CASE WHEN type = "created" THEN 1 ELSE 0 END) AS created_count,
            SUM(CASE WHEN type = "assigned" THEN 1 ELSE 0 END) AS assigned_count,
            SUM(CASE WHEN type = "commented" THEN 1 ELSE 0 END) AS commented_count,
            SUM(CASE WHEN type = "status_changed" THEN 1 ELSE 0 END) AS status_count,
            MAX(created_at) AS last_event_at
         FROM activities
         WHERE created_at >= ?'
    );
    $activityStmt->execute([$since]);
    $summary = $activityStmt->fetch() ?: [];

    $created = (int) ($summary['created_count'] ?? 0);
    $assigned = (int) ($summary['assigned_count'] ?? 0);
    $commented = (int) ($summary['commented_count'] ?? 0);
    $statusChanged = (int) ($summary['status_count'] ?? 0);
    $total = $created + $assigned + $commented + $statusChanged;

    if ($total === 0) {
        return null;
    }

    $parts = [];
    if ($created > 0) {
        $parts[] = $created . ' new bug' . ($created === 1 ? '' : 's');
    }
    if ($assigned > 0) {
        $parts[] = $assigned . ' assignment' . ($assigned === 1 ? '' : 's');
    }
    if ($commented > 0) {
        $parts[] = $commented . ' comment' . ($commented === 1 ? '' : 's');
    }
    if ($statusChanged > 0) {
        $parts[] = $statusChanged . ' status update' . ($statusChanged === 1 ? '' : 's');
    }

    return [
        'id' => 'digest-' . date('Ymd') . '-' . substr(sha1($email), 0, 10),
        'user_email' => $email,
        'title' => 'Daily digest',
        'body' => 'Last 24 hours: ' . implode(', ', $parts) . '.',
        'type' => 'daily_digest',
        'entity_type' => 'system',
        'entity_id' => (string) $user['id'],
        'target_page' => 'overview',
        'is_read' => 0,
        'created_at' => $summary['last_event_at'] ?? now(),
    ];
}

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'];
    $path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/', '/');
    $segments = $path === '' ? [] : explode('/', $path);

    if (($segments[0] ?? '') === 'api') {
        array_shift($segments);
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'health') {
        json_response(['ok' => true, 'service' => 'BlockBug PHP API']);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'login') {
        $data = read_json();
        require_fields($data, ['email', 'password']);
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? AND status = "active" LIMIT 1');
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify((string) $data['password'], $user['password_hash'])) {
            json_response(['message' => 'Invalid email or password'], 401);
            exit;
        }

        create_global_notification(
            $pdo,
            'User signed in',
            $user['name'] . ' signed in as ' . $user['role'],
            'user_login',
            'user',
            $user['id'],
            'team'
        );

        json_response(['user' => public_user($user)]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'signup') {
        $data = read_json();
        require_fields($data, ['name', 'email', 'password']);
        $settings = system_settings($pdo);
        if (empty($settings['allow_signup'])) {
            json_response(['message' => 'Public signup is disabled. Ask an administrator to create your account.'], 403);
            exit;
        }

        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $exists->execute([$data['email']]);
        if ($exists->fetch()) {
            json_response(['message' => 'An account with this email already exists.'], 409);
            exit;
        }

        $id = bin2hex(random_bytes(8));
        $stmt = $pdo->prepare('INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, "tester", "active")');
        $stmt->execute([$id, $data['name'], $data['email'], password_hash((string) $data['password'], PASSWORD_DEFAULT)]);

        create_global_notification(
            $pdo,
            'New account created',
            $data['name'] . ' joined BlockBug as tester',
            'user_created',
            'user',
            $id,
            'team'
        );

        $user = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $user->execute([$id]);
        json_response(['user' => public_user($user->fetch())], 201);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'users') {
        $users = $pdo->query('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users ORDER BY name')->fetchAll();
        json_response(['users' => array_map('public_user', $users)]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'users' && !isset($segments[1])) {
        $data = read_json();
        require_fields($data, ['name', 'email', 'password', 'role']);

        $allowedRoles = ['admin', 'manager', 'developer', 'tester'];
        if (!in_array($data['role'], $allowedRoles, true)) {
            json_response(['message' => 'Invalid role supplied.'], 422);
            exit;
        }

        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $exists->execute([$data['email']]);
        if ($exists->fetch()) {
            json_response(['message' => 'An account with this email already exists.'], 409);
            exit;
        }

        $id = bin2hex(random_bytes(8));
        $status = in_array($data['status'] ?? 'active', ['active', 'inactive'], true) ? $data['status'] : 'active';
        $stmt = $pdo->prepare('INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $id,
            $data['name'],
            $data['email'],
            password_hash((string) $data['password'], PASSWORD_DEFAULT),
            $data['role'],
            $status,
        ]);

        create_global_notification(
            $pdo,
            'Team member added',
            $data['name'] . ' was added as ' . $data['role'],
            'user_created',
            'user',
            $id,
            'team'
        );

        $user = $pdo->prepare('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE id = ?');
        $user->execute([$id]);
        json_response(['user' => public_user($user->fetch())], 201);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'roles') {
        json_response(['roles' => role_definitions()]);
        exit;
    }

    if ($method === 'PATCH' && ($segments[0] ?? '') === 'users' && isset($segments[1])) {
        $data = read_json();
        $sets = [];
        $params = [];
        foreach (['name', 'role', 'status'] as $field) {
            if (array_key_exists($field, $data)) {
                $sets[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }
        if (!$sets) {
            json_response(['message' => 'No supported fields were provided.'], 422);
            exit;
        }
        $sets[] = 'updated_at = ?';
        $params[] = now();
        $params[] = $segments[1];
        $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($params);
        $user = $pdo->prepare('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE id = ?');
        $user->execute([$segments[1]]);
        $updatedUser = $user->fetch();
        create_global_notification(
            $pdo,
            'User updated',
            ($updatedUser['name'] ?? 'A user') . ' was updated to role ' . ($updatedUser['role'] ?? 'unknown') . ' and status ' . ($updatedUser['status'] ?? 'unknown'),
            'user_updated',
            'user',
            (string) ($updatedUser['id'] ?? $segments[1]),
            'team'
        );
        json_response(['user' => public_user($updatedUser)]);
        exit;
    }

    if ($method === 'DELETE' && ($segments[0] ?? '') === 'users' && isset($segments[1])) {
        $user = $pdo->prepare('SELECT id, name, email, role, status FROM users WHERE id = ? LIMIT 1');
        $user->execute([$segments[1]]);
        $existingUser = $user->fetch();
        if (!$existingUser) {
            json_response(['message' => 'User not found'], 404);
            exit;
        }

        $delete = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $delete->execute([$segments[1]]);

        create_global_notification(
            $pdo,
            'User deleted',
            $existingUser['name'] . ' was removed from the workspace',
            'user_deleted',
            'user',
            $segments[1],
            'team'
        );

        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'users' && isset($segments[1]) && ($segments[2] ?? '') === 'password') {
        $data = read_json();
        require_fields($data, ['currentPassword', 'newPassword']);
        $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$segments[1]]);
        $target = $stmt->fetch();
        if (!$target || !password_verify((string) $data['currentPassword'], $target['password_hash'])) {
            json_response(['message' => 'Current password is incorrect.'], 422);
            exit;
        }
        $update = $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
        $update->execute([password_hash((string) $data['newPassword'], PASSWORD_DEFAULT), now(), $segments[1]]);
        $targetUser = $pdo->prepare('SELECT name FROM users WHERE id = ? LIMIT 1');
        $targetUser->execute([$segments[1]]);
        $userRecord = $targetUser->fetch();
        create_global_notification(
            $pdo,
            'Password changed',
            ($userRecord['name'] ?? 'A user') . ' updated account security settings',
            'password_changed',
            'user',
            $segments[1],
            'settings'
        );
        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'projects') {
        $projects = $pdo->query('SELECT id, name, description, project_key, status, team_size, created_at, updated_at FROM projects ORDER BY created_at DESC')->fetchAll();
        json_response(['projects' => array_map('project_record', $projects)]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'projects') {
        $data = read_json();
        require_fields($data, ['name', 'description', 'key']);
        $id = 'proj-' . bin2hex(random_bytes(4));
        $stmt = $pdo->prepare('INSERT INTO projects (id, name, description, project_key, status, team_size) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $data['name'], $data['description'], strtoupper((string) $data['key']), $data['status'] ?? 'active', (int) ($data['teamSize'] ?? 1)]);
        $project = $pdo->prepare('SELECT id, name, description, project_key, status, team_size, created_at, updated_at FROM projects WHERE id = ?');
        $project->execute([$id]);
        $createdProject = $project->fetch();
        create_global_notification(
            $pdo,
            'Project created',
            notification_project_label($createdProject) . ' was added with status ' . ($createdProject['status'] ?? 'active'),
            'project_created',
            'project',
            $id,
            'projects'
        );
        json_response(['project' => project_record($createdProject)], 201);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'bugs' && !isset($segments[1])) {
        $sql = 'SELECT * FROM bugs';
        $params = [];
        if (isset($_GET['reported_by']) && $_GET['reported_by'] !== '') {
            $sql .= ' WHERE reported_by = ?';
            $params[] = $_GET['reported_by'];
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        json_response(['bugs' => array_map('bug_record', $stmt->fetchAll())]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'bugs' && !isset($segments[1])) {
        $data = read_json();
        require_fields($data, ['title', 'description', 'projectId', 'reportedBy']);
        $settings = system_settings($pdo);
        $priority = $data['priority'] ?? $settings['default_bug_priority'] ?? 'medium';
        $severity = $data['severity'] ?? $settings['default_bug_severity'] ?? 'major';
        $status = $data['status'] ?? $settings['default_bug_status'] ?? 'open';
        $assignedTo = $data['assignedTo'] ?? resolve_default_assignee($pdo, (string) ($settings['default_assignee_rule'] ?? 'unassigned'), (string) $data['reportedBy']);

        $id = 'bug-' . time() . '-' . bin2hex(random_bytes(3));
        $stmt = $pdo->prepare(
            'INSERT INTO bugs (id, title, description, status, priority, severity, project_id, assigned_to, reported_by, steps_to_reproduce, expected_result, actual_result, environment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $data['title'],
            $data['description'],
            $status,
            $priority,
            $severity,
            $data['projectId'],
            $assignedTo,
            $data['reportedBy'],
            $data['stepsToReproduce'] ?? null,
            $data['expectedResult'] ?? null,
            $data['actualResult'] ?? null,
            $data['environment'] ?? null,
        ]);

        $name = $data['reportedBy'];
        $userStmt = $pdo->prepare('SELECT name FROM users WHERE email = ? LIMIT 1');
        $userStmt->execute([$data['reportedBy']]);
        if ($user = $userStmt->fetch()) {
            $name = $user['name'];
        }

        $activity = $pdo->prepare('INSERT INTO activities (id, bug_id, type, user_id, user_name, message) VALUES (?, ?, "created", ?, ?, ?)');
        $activity->execute(['act-' . bin2hex(random_bytes(6)), $id, $data['reportedBy'], $name, 'Created new bug report']);

        $bugLabel = strtoupper(substr($id, 0, 8)) . ' - ' . $data['title'];

        create_global_notification(
            $pdo,
            'New bug report',
            $name . ' reported ' . $bugLabel,
            'bug_created',
            'bug',
            $id,
            'bugs'
        );

        if (!empty($data['assignedTo'])) {
            create_global_notification(
                $pdo,
                'Bug assigned',
                $bugLabel . ' was assigned to ' . $data['assignedTo'],
                'bug_assigned',
                'bug',
                $id,
                'bugs'
            );
        }

        $bug = $pdo->prepare('SELECT * FROM bugs WHERE id = ?');
        $bug->execute([$id]);
        json_response(['bug' => bug_record($bug->fetch())], 201);
        exit;
    }

    if ($method === 'PATCH' && ($segments[0] ?? '') === 'bugs' && isset($segments[1])) {
        $data = read_json();
        $before = $pdo->prepare('SELECT * FROM bugs WHERE id = ?');
        $before->execute([$segments[1]]);
        $existingBug = $before->fetch();
        if (!$existingBug) {
            json_response(['message' => 'Bug not found'], 404);
            exit;
        }

        $allowed = ['status', 'assignedTo'];
        $sets = [];
        $params = [];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $column = $field === 'assignedTo' ? 'assigned_to' : $field;
                $sets[] = "{$column} = ?";
                $params[] = $data[$field] ?: null;
            }
        }
        if (!$sets) {
            json_response(['message' => 'No supported fields were provided.'], 422);
            exit;
        }
        $sets[] = 'updated_at = ?';
        $params[] = now();
        $params[] = $segments[1];
        $stmt = $pdo->prepare('UPDATE bugs SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($params);

        if (array_key_exists('status', $data) && $data['status'] !== $existingBug['status']) {
            $userName = $data['userName'] ?? 'System';
            $userEmail = $data['userEmail'] ?? 'system@blockbug.dev';
            $activity = $pdo->prepare('INSERT INTO activities (id, bug_id, type, user_id, user_name, message) VALUES (?, ?, "status_changed", ?, ?, ?)');
            $activity->execute(['act-' . bin2hex(random_bytes(6)), $segments[1], $userEmail, $userName, 'Changed status to ' . $data['status']]);
            create_global_notification(
                $pdo,
                'Status updated',
                $userName . ' moved ' . notification_bug_label($existingBug) . ' to ' . str_replace('-', ' ', (string) $data['status']),
                'status_changed',
                'bug',
                $segments[1],
                'bugs'
            );
        }

        if (array_key_exists('assignedTo', $data) && $data['assignedTo'] !== ($existingBug['assigned_to'] ?? null) && !empty($data['assignedTo'])) {
            $userName = $data['userName'] ?? 'System';
            $activity = $pdo->prepare('INSERT INTO activities (id, bug_id, type, user_id, user_name, message) VALUES (?, ?, "assigned", ?, ?, ?)');
            $activity->execute(['act-' . bin2hex(random_bytes(6)), $segments[1], $data['userEmail'] ?? 'system@blockbug.dev', $userName, 'Assigned bug to ' . $data['assignedTo']]);
            create_global_notification(
                $pdo,
                'Bug assigned',
                $userName . ' assigned ' . notification_bug_label($existingBug) . ' to ' . $data['assignedTo'],
                'bug_assigned',
                'bug',
                $segments[1],
                'bugs'
            );
        }

        $bug = $pdo->prepare('SELECT * FROM bugs WHERE id = ?');
        $bug->execute([$segments[1]]);
        json_response(['bug' => bug_record($bug->fetch())]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'bugs' && isset($segments[1]) && ($segments[2] ?? '') === 'comments') {
        $stmt = $pdo->prepare('SELECT * FROM bug_comments WHERE bug_id = ? ORDER BY created_at DESC');
        $stmt->execute([$segments[1]]);
        json_response(['comments' => array_map('comment_record', $stmt->fetchAll())]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'bugs' && isset($segments[1]) && ($segments[2] ?? '') === 'comments') {
        $data = read_json();
        require_fields($data, ['comment', 'userEmail', 'userName']);
        $id = 'comment-' . bin2hex(random_bytes(6));
        $stmt = $pdo->prepare('INSERT INTO bug_comments (id, bug_id, user_email, user_name, comment) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$id, $segments[1], $data['userEmail'], $data['userName'], $data['comment']]);
        $activity = $pdo->prepare('INSERT INTO activities (id, bug_id, type, user_id, user_name, message) VALUES (?, ?, "commented", ?, ?, ?)');
        $activity->execute(['act-' . bin2hex(random_bytes(6)), $segments[1], $data['userEmail'], $data['userName'], 'Added a comment']);

        $bugStmt = $pdo->prepare('SELECT id, title, reported_by, assigned_to FROM bugs WHERE id = ? LIMIT 1');
        $bugStmt->execute([$segments[1]]);
        $bug = $bugStmt->fetch();
        if ($bug) {
            $bugCode = strtoupper(substr((string) $bug['id'], 0, 8));
            create_global_notification(
                $pdo,
                'Comment on ' . $bugCode,
                $data['userName'] . ': "' . notification_text_preview((string) $data['comment']) . '"',
                'comment_added',
                'bug',
                $segments[1],
                'bugs'
            );
        }

        $comment = $pdo->prepare('SELECT * FROM bug_comments WHERE id = ?');
        $comment->execute([$id]);
        json_response(['comment' => comment_record($comment->fetch())], 201);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'activities') {
        $activities = $pdo->query('SELECT * FROM activities ORDER BY created_at DESC LIMIT 20')->fetchAll();
        json_response(['activities' => array_map('activity_record', $activities)]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'notifications') {
        $email = $_GET['user_email'] ?? null;
        if ($email) {
            $stmt = $pdo->prepare('SELECT * FROM notifications WHERE user_email IS NULL OR user_email = ? ORDER BY created_at DESC LIMIT 20');
            $stmt->execute([$email]);
            $notifications = $stmt->fetchAll();
            $preferences = preferences_for_user_email($pdo, (string) $email);
            $notifications = array_values(array_filter(
                $notifications,
                static fn(array $notification): bool => should_include_notification_for_preferences($notification, $preferences)
            ));

            if ($preferences['daily_digest'] ?? true) {
                $digest = build_daily_digest_notification($pdo, (string) $email);
                if ($digest) {
                    array_unshift($notifications, $digest);
                }
            }

            json_response(['notifications' => array_map('notification_record', array_slice($notifications, 0, 20))]);
        } else {
            $stmt = $pdo->query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20');
            json_response(['notifications' => array_map('notification_record', $stmt->fetchAll())]);
        }
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'preferences') {
        $userId = $_GET['user_id'] ?? '';
        $preferences = [
            'email_notifications' => true,
            'bug_assigned' => true,
            'comment_notifications' => true,
            'daily_digest' => true,
        ];
        $stmt = $pdo->prepare('SELECT preference_key, enabled FROM user_preferences WHERE user_id = ? ORDER BY preference_key');
        $stmt->execute([$userId]);
        foreach ($stmt->fetchAll() as $row) {
            $preferences[$row['preference_key']] = (bool) $row['enabled'];
        }
        json_response(['preferences' => $preferences]);
        exit;
    }

    if ($method === 'PATCH' && ($segments[0] ?? '') === 'preferences') {
        $data = read_json();
        require_fields($data, ['userId']);
        $preferences = [
            'email_notifications' => true,
            'bug_assigned' => true,
            'comment_notifications' => true,
            'daily_digest' => true,
            ...($data['preferences'] ?? []),
        ];
        $stmt = $pdo->prepare(
            'INSERT INTO user_preferences (id, user_id, preference_key, enabled) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = CURRENT_TIMESTAMP'
        );
        foreach ($preferences as $key => $enabled) {
            $stmt->execute(['pref-' . $data['userId'] . '-' . $key, $data['userId'], $key, $enabled ? 1 : 0]);
        }
        json_response(['preferences' => $preferences]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'system-settings') {
        json_response(['settings' => system_settings($pdo)]);
        exit;
    }

    if ($method === 'PATCH' && ($segments[0] ?? '') === 'system-settings') {
        $data = read_json();
        $settings = $data['settings'] ?? [];
        if (isset($settings['session_timeout_minutes'])) {
            $settings['session_timeout_minutes'] = max(15, (int) $settings['session_timeout_minutes']);
        }
        if (isset($settings['allow_signup'])) {
            $settings['allow_signup'] = (bool) $settings['allow_signup'];
        }
        $stmt = $pdo->prepare(
            'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP'
        );
        foreach ($settings as $key => $value) {
            $stmt->execute([$key, json_encode($value, JSON_THROW_ON_ERROR)]);
        }
        create_global_notification(
            $pdo,
            'System settings updated',
            'Workspace configuration was updated',
            'system_settings_updated',
            'system',
            null,
            'settings'
        );
        json_response(['settings' => system_settings($pdo)]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'api-keys') {
        $userId = $_GET['user_id'] ?? '';
        $stmt = $pdo->prepare('SELECT id, user_id, key_label, key_prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC');
        $stmt->execute([$userId]);
        json_response(['apiKeys' => array_map('api_key_record', $stmt->fetchAll())]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'api-keys') {
        $data = read_json();
        require_fields($data, ['userId']);
        $plain = 'bb_live_' . bin2hex(random_bytes(12));
        $id = 'key-' . bin2hex(random_bytes(6));
        $stmt = $pdo->prepare('INSERT INTO api_keys (id, user_id, key_label, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$id, $data['userId'], $data['label'] ?? 'Generated key', substr($plain, 0, 16), password_hash($plain, PASSWORD_DEFAULT)]);
        $key = $pdo->prepare('SELECT id, user_id, key_label, key_prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE id = ?');
        $key->execute([$id]);
        $userStmt = $pdo->prepare('SELECT name FROM users WHERE id = ? LIMIT 1');
        $userStmt->execute([$data['userId']]);
        $userRecord = $userStmt->fetch();
        create_global_notification(
            $pdo,
            'API key generated',
            ($userRecord['name'] ?? 'A user') . ' generated a new API key',
            'api_key_created',
            'user',
            $data['userId'],
            'settings'
        );
        json_response(['apiKey' => api_key_record($key->fetch()), 'plainKey' => $plain], 201);
        exit;
    }

    if ($method === 'DELETE' && ($segments[0] ?? '') === 'api-keys' && isset($segments[1])) {
        $stmt = $pdo->prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ?');
        $stmt->execute([now(), $segments[1]]);
        create_global_notification(
            $pdo,
            'API key revoked',
            'An API key was revoked',
            'api_key_revoked',
            'system',
            $segments[1],
            'settings'
        );
        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'integrations') {
        $integrations = $pdo->query('SELECT * FROM integrations ORDER BY name')->fetchAll();
        json_response(['integrations' => array_map('integration_record', $integrations)]);
        exit;
    }

    if ($method === 'PATCH' && ($segments[0] ?? '') === 'integrations' && isset($segments[1])) {
        $data = read_json();
        require_fields($data, ['status']);
        $stmt = $pdo->prepare('UPDATE integrations SET status = ?, updated_at = ? WHERE id = ?');
        $stmt->execute([$data['status'], now(), $segments[1]]);
        $integration = $pdo->prepare('SELECT * FROM integrations WHERE id = ?');
        $integration->execute([$segments[1]]);
        $updatedIntegration = $integration->fetch();
        create_global_notification(
            $pdo,
            'Integration updated',
            ($updatedIntegration['name'] ?? 'Integration') . ' is now ' . ($updatedIntegration['status'] ?? 'updated'),
            'integration_updated',
            'integration',
            $segments[1],
            'integrations'
        );
        json_response(['integration' => integration_record($updatedIntegration)]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'dashboard') {
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $days[$date] = 0;
        }
        $stmt = $pdo->query("SELECT DATE(created_at) AS day, COUNT(*) AS total FROM bugs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at)");
        foreach ($stmt->fetchAll() as $row) {
            if (isset($days[$row['day']])) {
                $days[$row['day']] = (int) $row['total'];
            }
        }

        $currentWeek = (int) $pdo->query("SELECT COUNT(*) FROM bugs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
        $previousWeek = (int) $pdo->query("SELECT COUNT(*) FROM bugs WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)")->fetchColumn();
        $activeUsers = $pdo->query('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE status = "active" ORDER BY name LIMIT 5')->fetchAll();

        json_response([
            'weeklyBugs' => [
                'categories' => array_map(fn ($day) => date('D', strtotime($day)), array_keys($days)),
                'data' => array_values($days),
            ],
            'weekDelta' => [
                'current' => $currentWeek,
                'previous' => $previousWeek,
                'percent' => $previousWeek > 0 ? round((($currentWeek - $previousWeek) / $previousWeek) * 100) : ($currentWeek > 0 ? 100 : 0),
            ],
            'activeUsers' => array_map('public_user', $activeUsers),
            'quickActions' => [
                'openBugs' => (int) $pdo->query('SELECT COUNT(*) FROM bugs WHERE status = "open"')->fetchColumn(),
                'analyticsReports' => (int) $pdo->query('SELECT COUNT(*) FROM bugs')->fetchColumn(),
                'pendingVerification' => (int) $pdo->query('SELECT COUNT(*) FROM bugs WHERE status = "resolved" AND verified_at IS NULL')->fetchColumn(),
                'teamMembers' => (int) $pdo->query('SELECT COUNT(*) FROM users WHERE status = "active"')->fetchColumn(),
            ],
        ]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'maintenance' && ($segments[1] ?? '') === 'export') {
        json_response([
            'generatedAt' => now(),
            'users' => $pdo->query('SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY name')->fetchAll(),
            'projects' => $pdo->query('SELECT id, name, description, project_key, status, team_size, created_at, updated_at FROM projects ORDER BY created_at DESC')->fetchAll(),
            'bugs' => $pdo->query('SELECT * FROM bugs ORDER BY created_at DESC')->fetchAll(),
            'reports' => [
                'stats' => bug_stats($pdo),
                'settings' => system_settings($pdo),
            ],
        ]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'maintenance' && ($segments[1] ?? '') === 'clear-data') {
        $data = read_json();
        $target = $data['target'] ?? 'all';
        if ($target === 'notifications' || $target === 'all') {
            $pdo->exec('DELETE FROM notifications');
        }
        if ($target === 'activity' || $target === 'all') {
            $pdo->exec('DELETE FROM activities');
        }
        if ($target !== 'notifications' && $target !== 'all') {
            create_global_notification(
                $pdo,
                'Maintenance action',
                'Maintenance cleared ' . $target . ' data',
                'maintenance_action',
                'system',
                $target,
                'settings'
            );
        }
        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'maintenance' && ($segments[1] ?? '') === 'reset-demo') {
        run_seed($pdo);
        create_global_notification(
            $pdo,
            'Demo data reset',
            'The workspace was reset to demo data',
            'demo_reset',
            'system',
            'demo',
            'settings'
        );
        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'stats') {
        json_response(['stats' => bug_stats($pdo)]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'reports') {
        $priorityRows = $pdo->query('SELECT priority, COUNT(*) AS total FROM bugs GROUP BY priority')->fetchAll();
        $priorities = ['critical' => 0, 'high' => 0, 'medium' => 0, 'low' => 0];
        foreach ($priorityRows as $row) {
            $priorities[$row['priority']] = (int) $row['total'];
        }

        $summary = [
            'totalBugs' => (int) $pdo->query('SELECT COUNT(*) FROM bugs')->fetchColumn(),
            'activeProjects' => (int) $pdo->query('SELECT COUNT(*) FROM projects WHERE status = "active"')->fetchColumn(),
            'totalProjects' => (int) $pdo->query('SELECT COUNT(*) FROM projects')->fetchColumn(),
        ];
        $summary['avgBugsPerProject'] = $summary['totalProjects'] > 0
            ? round($summary['totalBugs'] / $summary['totalProjects'], 1)
            : 0;

        $projectRows = $pdo->query(
            'SELECT p.name, COALESCE(AVG(CASE WHEN b.verified_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, b.created_at, b.verified_at) / 24 END), 0) AS avg_days
             FROM projects p
             LEFT JOIN bugs b ON b.project_id = p.id
             GROUP BY p.id, p.name
             ORDER BY p.created_at ASC'
        )->fetchAll();

        json_response([
            'priorities' => $priorities,
            'summary' => $summary,
            'resolutionTimes' => array_map(fn ($row) => ['name' => $row['name'], 'days' => round((float) $row['avg_days'], 1)], $projectRows),
        ]);
        exit;
    }

    json_response(['message' => 'Not found'], 404);
} catch (Throwable $exception) {
    json_response(['message' => 'Server error', 'detail' => $exception->getMessage()], 500);
}
