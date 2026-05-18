<?php

declare(strict_types=1);

require __DIR__ . '/../config.php';
require __DIR__ . '/../database/seed_data.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Organization-Id');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function public_user(array $user): array
{
    unset($user['password_hash']);
    return camelize_record($user);
}

function enrich_user_with_organization(array $user, array $organization): array
{
    $user['organization_id'] = $organization['id'] ?? null;
    $user['organization_name'] = $organization['name'] ?? null;
    $user['organization_email'] = $organization['login_email'] ?? null;
    return $user;
}

function public_organization(array $organization): array
{
    unset($organization['password_hash']);
    return camelize_record($organization);
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

function attachment_record(array $attachment): array
{
    $attachment = camelize_record($attachment);
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
    $attachment['url'] = $scheme . '://' . $host . ($attachment['filePath'] ?? '');
    return $attachment;
}

function notification_record(array $notification): array
{
    return camelize_record($notification);
}

function blockchain_event_record(array $event): array
{
    return camelize_record($event);
}

function create_notification(
    PDO $pdo,
    ?string $userEmail,
    string $title,
    string $body,
    string $type,
    ?string $entityType = null,
    ?string $entityId = null,
    ?string $targetPage = null,
    ?string $organizationId = null
): void
{
    $organizationId = $organizationId ?: current_organization_id($pdo);
    $notification = $pdo->prepare(
        'INSERT INTO notifications (id, org_id, user_email, title, body, type, entity_type, entity_id, target_page) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $notification->execute(['notif-' . bin2hex(random_bytes(6)), $organizationId, $userEmail, $title, $body, $type, $entityType, $entityId, $targetPage]);
}

function create_global_notification(
    PDO $pdo,
    string $title,
    string $body,
    string $type,
    ?string $entityType = null,
    ?string $entityId = null,
    ?string $targetPage = null,
    ?string $organizationId = null
): void
{
    create_notification($pdo, null, $title, $body, $type, $entityType, $entityId, $targetPage, $organizationId);
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

function default_organization_definition(): array
{
    return [
        'id' => 'org-deepixel',
        'name' => 'Deepixel',
        'login_email' => 'deepixel@whatever',
        'password_hash' => password_hash('deepixel123', PASSWORD_DEFAULT),
        'status' => 'active',
    ];
}

function default_organization_id(PDO $pdo): ?string
{
    $stmt = $pdo->query('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1');
    $id = $stmt->fetchColumn();
    return $id !== false ? (string) $id : null;
}

function current_organization_id(PDO $pdo): ?string
{
    $headerOrgId = $_SERVER['HTTP_X_ORGANIZATION_ID'] ?? null;
    if (is_string($headerOrgId) && $headerOrgId !== '') {
        return $headerOrgId;
    }

    return default_organization_id($pdo);
}

function ensure_organization_bootstrap(PDO $pdo): void
{
    $organization = $pdo->query('SELECT * FROM organizations ORDER BY created_at ASC LIMIT 1')->fetch();
    if (!$organization) {
        $organization = default_organization_definition();
        $stmt = $pdo->prepare(
            'INSERT INTO organizations (id, name, login_email, password_hash, status) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $organization['id'],
            $organization['name'],
            $organization['login_email'],
            $organization['password_hash'],
            $organization['status'],
        ]);
    }

    $orgId = (string) $organization['id'];
    $pdo->prepare('UPDATE users SET org_id = ? WHERE org_id IS NULL')->execute([$orgId]);
    $pdo->prepare('UPDATE projects SET org_id = ? WHERE org_id IS NULL')->execute([$orgId]);
    $pdo->prepare('UPDATE bugs SET org_id = ? WHERE org_id IS NULL')->execute([$orgId]);
    $pdo->prepare('UPDATE activities SET org_id = ? WHERE org_id IS NULL')->execute([$orgId]);
    $pdo->prepare('UPDATE notifications SET org_id = ? WHERE org_id IS NULL')->execute([$orgId]);
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

function bug_stats(PDO $pdo, ?string $organizationId = null): array
{
    if ($organizationId) {
        $stmt = $pdo->prepare('SELECT status, priority, COUNT(*) AS total FROM bugs WHERE org_id = ? GROUP BY status, priority');
        $stmt->execute([$organizationId]);
        $rows = $stmt->fetchAll();
    } else {
        $rows = $pdo->query('SELECT status, priority, COUNT(*) AS total FROM bugs GROUP BY status, priority')->fetchAll();
    }
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

function resolve_default_assignee(PDO $pdo, string $rule, string $reportedBy, ?string $organizationId = null): ?string
{
    if ($rule === 'reporter') {
        return $reportedBy;
    }

    if ($rule === 'project-lead') {
        if ($organizationId) {
            $stmt = $pdo->prepare("SELECT email FROM users WHERE org_id = ? AND status = 'active' AND role IN ('manager', 'admin') ORDER BY FIELD(role, 'manager', 'admin'), name LIMIT 1");
            $stmt->execute([$organizationId]);
            $email = $stmt->fetchColumn();
        } else {
            $stmt = $pdo->query("SELECT email FROM users WHERE status = 'active' AND role IN ('manager', 'admin') ORDER BY FIELD(role, 'manager', 'admin'), name LIMIT 1");
            $email = $stmt->fetchColumn();
        }
        return $email !== false ? (string) $email : null;
    }

    return null;
}

function role_for_user_email(PDO $pdo, string $email, ?string $organizationId = null): ?string
{
    if ($organizationId) {
        $stmt = $pdo->prepare('SELECT role FROM users WHERE email = ? AND org_id = ? LIMIT 1');
        $stmt->execute([$email, $organizationId]);
    } else {
        $stmt = $pdo->prepare('SELECT role FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
    }
    $role = $stmt->fetchColumn();
    return $role !== false ? (string) $role : null;
}

function can_tester_verify_bug(array $bug, ?string $actorEmail): bool
{
    if (!$actorEmail) {
        return false;
    }

    $verificationTester = $bug['verification_tester_email'] ?? null;
    $reportedBy = $bug['reported_by'] ?? null;

    return $actorEmail === $verificationTester || $actorEmail === $reportedBy;
}

function can_developer_advance_bug(array $bug, ?string $actorEmail, ?string $actorRole, string $nextStatus): bool
{
    if ($actorRole !== 'developer' || !$actorEmail) {
        return false;
    }

    if (($bug['assigned_to'] ?? null) !== $actorEmail) {
        return false;
    }

    $currentStatus = (string) ($bug['status'] ?? '');
    return ($currentStatus === 'open' && $nextStatus === 'in-progress')
        || ($currentStatus === 'in-progress' && $nextStatus === 'resolved');
}

function preferences_for_user_email(PDO $pdo, string $email, ?string $organizationId = null): array
{
    $defaults = [
        'email_notifications' => true,
        'bug_assigned' => true,
        'comment_notifications' => true,
        'daily_digest' => true,
    ];

    if ($organizationId) {
        $userStmt = $pdo->prepare('SELECT id FROM users WHERE email = ? AND org_id = ? LIMIT 1');
        $userStmt->execute([$email, $organizationId]);
    } else {
        $userStmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $userStmt->execute([$email]);
    }
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
    $alwaysVisibleTypes = ['password_changed', 'api_key_created', 'api_key_revoked', 'user_created', 'user_updated'];

    if ($type === 'preferences_updated') {
        return false;
    }

    if (in_array($type, $alwaysVisibleTypes, true)) {
        return true;
    }

    if (($preferences['bug_assigned'] ?? true) === false && $type === 'bug_assigned') {
        return false;
    }

    if (($preferences['comment_notifications'] ?? true) === false && in_array($type, ['comment_added', 'comment_reply'], true)) {
        return false;
    }

    if (($preferences['daily_digest'] ?? true) === false && $type === 'daily_digest') {
        return false;
    }

    return true;
}

function build_daily_digest_notification(PDO $pdo, string $email, ?string $organizationId = null): ?array
{
    if ($organizationId) {
        $userStmt = $pdo->prepare('SELECT id, name FROM users WHERE email = ? AND org_id = ? LIMIT 1');
        $userStmt->execute([$email, $organizationId]);
    } else {
        $userStmt = $pdo->prepare('SELECT id, name FROM users WHERE email = ? LIMIT 1');
        $userStmt->execute([$email]);
    }
    $user = $userStmt->fetch();
    if (!$user) {
        return null;
    }

    $since = (new DateTimeImmutable('-1 day'))->format('Y-m-d H:i:s');

    if ($organizationId) {
        $activityStmt = $pdo->prepare(
            'SELECT
                SUM(CASE WHEN type = "created" THEN 1 ELSE 0 END) AS created_count,
                SUM(CASE WHEN type = "assigned" THEN 1 ELSE 0 END) AS assigned_count,
                SUM(CASE WHEN type = "commented" THEN 1 ELSE 0 END) AS commented_count,
                SUM(CASE WHEN type = "status_changed" THEN 1 ELSE 0 END) AS status_count,
                MAX(created_at) AS last_event_at
             FROM activities
             WHERE org_id = ? AND created_at >= ?'
        );
        $activityStmt->execute([$organizationId, $since]);
    } else {
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
    }
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

function upload_bug_attachment(PDO $pdo, string $bugId, array $file, string $uploadedBy): ?array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        json_response(['message' => 'Attachment upload failed.'], 422);
        exit;
    }

    $size = (int) ($file['size'] ?? 0);
    if ($size <= 0 || $size > 10 * 1024 * 1024) {
        json_response(['message' => 'Attachments must be smaller than 10 MB.'], 422);
        exit;
    }

    $tmpName = $file['tmp_name'] ?? '';
    if (!is_string($tmpName) || $tmpName === '' || !is_uploaded_file($tmpName)) {
        json_response(['message' => 'Invalid attachment upload.'], 422);
        exit;
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string) $finfo->file($tmpName);
    $allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-zip-compressed',
    ];

    if (!in_array($mimeType, $allowedMimeTypes, true)) {
        json_response(['message' => 'Unsupported attachment type.'], 422);
        exit;
    }

    $originalName = basename((string) ($file['name'] ?? 'attachment'));
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    $storedName = $bugId . '-' . bin2hex(random_bytes(6)) . ($extension !== '' ? '.' . strtolower($extension) : '');
    $uploadDirectory = __DIR__ . '/uploads/bugs';
    if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0777, true) && !is_dir($uploadDirectory)) {
        throw new RuntimeException('Could not create upload directory.');
    }

    $destination = $uploadDirectory . DIRECTORY_SEPARATOR . $storedName;
    if (!move_uploaded_file($tmpName, $destination)) {
        throw new RuntimeException('Could not save uploaded file.');
    }

    $id = 'attach-' . bin2hex(random_bytes(6));
    $filePath = '/uploads/bugs/' . $storedName;
    $stmt = $pdo->prepare(
        'INSERT INTO bug_attachments (id, bug_id, original_name, stored_name, file_path, mime_type, file_size, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$id, $bugId, $originalName, $storedName, $filePath, $mimeType, $size, $uploadedBy]);

    $attachment = $pdo->prepare('SELECT * FROM bug_attachments WHERE id = ? LIMIT 1');
    $attachment->execute([$id]);
    return $attachment->fetch() ?: null;
}

function delete_attachment_files(array $attachments): void
{
    foreach ($attachments as $attachment) {
        $relativePath = $attachment['file_path'] ?? null;
        if (!is_string($relativePath) || $relativePath === '') {
            continue;
        }

        $fullPath = __DIR__ . $relativePath;
        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }
}

function actor_role_from_request(array $data = []): ?string
{
    $queryRole = $_GET['actor_role'] ?? null;
    $bodyRole = $data['actorRole'] ?? null;
    $role = is_string($bodyRole) ? $bodyRole : (is_string($queryRole) ? $queryRole : null);
    return $role !== null ? strtolower($role) : null;
}

function require_admin_actor(array $data = []): void
{
    if (actor_role_from_request($data) !== 'admin') {
        json_response(['message' => 'This action is available to administrators only.'], 403);
        exit;
    }
}

function blockchain_service_url(): ?string
{
    $enabled = strtolower((string) env_value('BLOCKCHAIN_ENABLED', 'false'));
    if (in_array($enabled, ['0', 'false', 'off', 'no'], true)) {
        return null;
    }

    $url = trim((string) env_value('BLOCKCHAIN_AUDIT_SERVICE_URL', 'http://127.0.0.1:8787'));
    return $url !== '' ? rtrim($url, '/') : null;
}

function blockchain_http_json(string $method, string $url, ?array $payload = null): array
{
    $headers = ["Content-Type: application/json"];
    $options = [
        'http' => [
            'method' => strtoupper($method),
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
            'timeout' => 5,
        ],
    ];

    if ($payload !== null) {
        $options['http']['content'] = json_encode($payload, JSON_THROW_ON_ERROR);
    }

    $context = stream_context_create($options);
    $responseBody = @file_get_contents($url, false, $context);
    $statusCode = 0;
    $responseHeaders = $http_response_header ?? [];

    if (isset($responseHeaders[0]) && preg_match('/\s(\d{3})\s/', $responseHeaders[0], $matches)) {
        $statusCode = (int) $matches[1];
    }

    $decoded = null;
    if (is_string($responseBody) && trim($responseBody) !== '') {
        $decoded = json_decode($responseBody, true);
    }

    return [
        'statusCode' => $statusCode,
        'body' => is_array($decoded) ? $decoded : null,
        'rawBody' => is_string($responseBody) ? $responseBody : null,
    ];
}

function blockchain_cli_json(array $payload): array
{
    $nodeBinary = trim((string) env_value('BLOCKCHAIN_NODE_BINARY', 'C:\Program Files\nodejs\node.exe'));
    if ($nodeBinary === '') {
        $nodeBinary = 'node';
    }

    $scriptPath = realpath(__DIR__ . '/../../blockchain/scripts/record-bug-event.js');
    if ($scriptPath === false) {
        throw new RuntimeException('Blockchain CLI script not found.');
    }

    $tempFile = tempnam(sys_get_temp_dir(), 'bb-chain-');
    if ($tempFile === false) {
        throw new RuntimeException('Could not create blockchain payload file.');
    }

    file_put_contents($tempFile, json_encode($payload, JSON_THROW_ON_ERROR));

    $command = '"' . $nodeBinary . '" "' . $scriptPath . '" "' . $tempFile . '"';
    $descriptorSpec = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];

    $process = proc_open($command, $descriptorSpec, $pipes, realpath(__DIR__ . '/../../blockchain'));
    if (!is_resource($process)) {
        @unlink($tempFile);
        throw new RuntimeException('Could not start blockchain CLI process.');
    }

    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);

    $exitCode = proc_close($process);
    @unlink($tempFile);

    if ($exitCode !== 0) {
        throw new RuntimeException(trim($stderr ?: $stdout ?: 'Blockchain CLI process failed.'));
    }

    $decoded = json_decode($stdout ?: '', true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Blockchain CLI returned invalid JSON.');
    }

    return $decoded;
}

function record_bug_blockchain_event(
    PDO $pdo,
    string $bugId,
    string $action,
    ?string $actorEmail,
    ?string $actorRole,
    array $metadata = []
): void
{
    $eventId = 'chain-' . bin2hex(random_bytes(6));
    $metadataJson = json_encode($metadata, JSON_THROW_ON_ERROR);

    $insert = $pdo->prepare(
        'INSERT INTO bug_blockchain_events (id, bug_id, action, sync_status, created_by_email, metadata_json)
         VALUES (?, ?, ?, "pending", ?, ?)'
    );
    $insert->execute([$eventId, $bugId, $action, $actorEmail, $metadataJson]);

    $serviceUrl = blockchain_service_url();
    if ($serviceUrl === null) {
        $update = $pdo->prepare(
            'UPDATE bug_blockchain_events
             SET sync_status = "failed", error_message = ?, service_response = ?, updated_at = ?
             WHERE id = ?'
        );
        $update->execute([
            'Blockchain audit service is disabled.',
            json_encode(['enabled' => false], JSON_THROW_ON_ERROR),
            now(),
            $eventId,
        ]);

        $bugUpdate = $pdo->prepare(
            'UPDATE bugs
             SET blockchain_last_sync_status = "failed", blockchain_last_synced_at = ?
             WHERE id = ?'
        );
        $bugUpdate->execute([now(), $bugId]);
        return;
    }

    try {
        $payload = [
            'bugId' => $bugId,
            'action' => $action,
            'actorEmail' => $actorEmail ?: 'system@blockbug.dev',
            'actorRole' => $actorRole ?: 'system',
            'metadata' => $metadata,
        ];
        $response = blockchain_http_json('POST', $serviceUrl . '/record-bug-event', $payload);

        if ($response['statusCode'] === 0) {
            $body = blockchain_cli_json($payload);
            $response = [
                'statusCode' => 201,
                'body' => $body,
                'rawBody' => json_encode($body, JSON_THROW_ON_ERROR),
            ];
        }

        $body = $response['body'];
        if (($response['statusCode'] >= 200 && $response['statusCode'] < 300) && is_array($body) && !empty($body['ok'])) {
            $update = $pdo->prepare(
                'UPDATE bug_blockchain_events
                 SET sync_status = "synced",
                     transaction_hash = ?,
                     blockchain_event_id = ?,
                     bug_chain_id = ?,
                     contract_address = ?,
                     service_response = ?,
                     updated_at = ?
                 WHERE id = ?'
            );
            $update->execute([
                $body['transactionHash'] ?? null,
                isset($body['blockchainEventId']) ? (int) $body['blockchainEventId'] : null,
                $body['bugChainId'] ?? null,
                $body['contractAddress'] ?? null,
                json_encode($body, JSON_THROW_ON_ERROR),
                now(),
                $eventId,
            ]);

            $bugUpdate = $pdo->prepare(
                'UPDATE bugs
                 SET blockchain_last_tx_hash = ?,
                     blockchain_last_sync_status = "synced",
                     blockchain_last_event_id = ?,
                     blockchain_bug_chain_id = ?,
                     blockchain_last_synced_at = ?
                 WHERE id = ?'
            );
            $bugUpdate->execute([
                $body['transactionHash'] ?? null,
                isset($body['blockchainEventId']) ? (int) $body['blockchainEventId'] : null,
                $body['bugChainId'] ?? null,
                now(),
                $bugId,
            ]);
            return;
        }

        $errorMessage = is_array($body) ? ($body['message'] ?? 'Unexpected blockchain audit response.') : 'Unexpected blockchain audit response.';
        $update = $pdo->prepare(
            'UPDATE bug_blockchain_events
             SET sync_status = "failed", error_message = ?, service_response = ?, updated_at = ?
             WHERE id = ?'
        );
        $update->execute([
            (string) $errorMessage,
            json_encode([
                'statusCode' => $response['statusCode'],
                'body' => $body,
                'rawBody' => $response['rawBody'],
            ], JSON_THROW_ON_ERROR),
            now(),
            $eventId,
        ]);
    } catch (Throwable $exception) {
        $update = $pdo->prepare(
            'UPDATE bug_blockchain_events
             SET sync_status = "failed", error_message = ?, service_response = ?, updated_at = ?
             WHERE id = ?'
        );
        $update->execute([
            $exception->getMessage(),
            json_encode(['exception' => $exception->getMessage()], JSON_THROW_ON_ERROR),
            now(),
            $eventId,
        ]);
    }

    $bugUpdate = $pdo->prepare(
        'UPDATE bugs
         SET blockchain_last_sync_status = "failed", blockchain_last_synced_at = ?
         WHERE id = ?'
    );
    $bugUpdate->execute([now(), $bugId]);
}

function replay_bug_blockchain_event(PDO $pdo, string $bugId, string $action): bool
{
    $bugStmt = $pdo->prepare('SELECT * FROM bugs WHERE id = ? LIMIT 1');
    $bugStmt->execute([$bugId]);
    $bug = $bugStmt->fetch();
    if (!$bug) {
        return false;
    }

    $actorEmail = $bug['reported_by'] ?? null;
    $actorRole = $actorEmail ? role_for_user_email($pdo, (string) $actorEmail, (string) ($bug['org_id'] ?? '')) : null;
    $metadata = [
        'title' => (string) ($bug['title'] ?? ''),
        'projectId' => (string) ($bug['project_id'] ?? ''),
        'status' => (string) ($bug['status'] ?? ''),
        'priority' => (string) ($bug['priority'] ?? ''),
        'severity' => (string) ($bug['severity'] ?? ''),
        'assignedTo' => $bug['assigned_to'] ?? null,
        'verificationTesterEmail' => $bug['verification_tester_email'] ?? null,
        'reportedBy' => $bug['reported_by'] ?? null,
    ];

    if ($action === 'bug_status_changed' || $action === 'bug_verified' || $action === 'bug_verification_rejected') {
        $latestEventStmt = $pdo->prepare(
            'SELECT metadata_json FROM bug_blockchain_events
             WHERE bug_id = ? AND action = ? AND sync_status = "failed"
             ORDER BY created_at DESC, id DESC
             LIMIT 1'
        );
        $latestEventStmt->execute([$bugId, $action]);
        $latestMetadataJson = $latestEventStmt->fetchColumn();
        if (is_string($latestMetadataJson) && $latestMetadataJson !== '') {
            $decoded = json_decode($latestMetadataJson, true);
            if (is_array($decoded)) {
                $metadata = array_merge($metadata, $decoded);
            }
        }
    }

    record_bug_blockchain_event(
        $pdo,
        $bugId,
        $action,
        is_string($actorEmail) ? $actorEmail : null,
        $actorRole,
        $metadata
    );

    return true;
}

try {
    $pdo = db();
    ensure_organization_bootstrap($pdo);
    $organizationId = current_organization_id($pdo);
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
        require_fields($data, ['organizationEmail', 'organizationPassword', 'email', 'password']);
        $organizationStmt = $pdo->prepare('SELECT * FROM organizations WHERE login_email = ? AND status = "active" LIMIT 1');
        $organizationStmt->execute([$data['organizationEmail']]);
        $organization = $organizationStmt->fetch();
        if (!$organization || !password_verify((string) $data['organizationPassword'], $organization['password_hash'])) {
            json_response(['message' => 'Invalid organization ID or password'], 401);
            exit;
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? AND org_id = ? AND status = "active" LIMIT 1');
        $stmt->execute([$data['email'], $organization['id']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify((string) $data['password'], $user['password_hash'])) {
            json_response(['message' => 'Invalid email or password'], 401);
            exit;
        }

        json_response(['user' => public_user(enrich_user_with_organization($user, $organization))]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'organization-login') {
        $data = read_json();
        require_fields($data, ['organizationEmail', 'organizationPassword']);
        $organizationStmt = $pdo->prepare('SELECT * FROM organizations WHERE login_email = ? AND status = "active" LIMIT 1');
        $organizationStmt->execute([$data['organizationEmail']]);
        $organization = $organizationStmt->fetch();
        if (!$organization || !password_verify((string) $data['organizationPassword'], $organization['password_hash'])) {
            json_response(['message' => 'Invalid organization ID or password'], 401);
            exit;
        }

        json_response(['organization' => public_organization($organization)]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'member-login') {
        $data = read_json();
        require_fields($data, ['organizationId', 'email', 'password']);
        $organizationStmt = $pdo->prepare('SELECT * FROM organizations WHERE id = ? AND status = "active" LIMIT 1');
        $organizationStmt->execute([$data['organizationId']]);
        $organization = $organizationStmt->fetch();
        if (!$organization) {
            json_response(['message' => 'Organization not found or inactive'], 404);
            exit;
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? AND org_id = ? AND status = "active" LIMIT 1');
        $stmt->execute([$data['email'], $organization['id']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify((string) $data['password'], $user['password_hash'])) {
            json_response(['message' => 'Invalid email or password'], 401);
            exit;
        }

        json_response(['user' => public_user(enrich_user_with_organization($user, $organization))]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'signup') {
        $data = read_json();
        require_fields($data, ['organizationName', 'organizationEmail', 'organizationPassword', 'adminName', 'adminEmail', 'adminPassword']);
        $settings = system_settings($pdo);
        if (empty($settings['allow_signup'])) {
            json_response(['message' => 'Public signup is disabled. Ask an administrator to create your account.'], 403);
            exit;
        }

        $orgExists = $pdo->prepare('SELECT id FROM organizations WHERE login_email = ? LIMIT 1');
        $orgExists->execute([$data['organizationEmail']]);
        if ($orgExists->fetch()) {
            json_response(['message' => 'An organization with this ID already exists.'], 409);
            exit;
        }

        $organizationId = 'org-' . bin2hex(random_bytes(6));
        $organizationInsert = $pdo->prepare(
            'INSERT INTO organizations (id, name, login_email, password_hash, status) VALUES (?, ?, ?, ?, "active")'
        );
        $organizationInsert->execute([
            $organizationId,
            $data['organizationName'],
            $data['organizationEmail'],
            password_hash((string) $data['organizationPassword'], PASSWORD_DEFAULT),
        ]);

        $id = bin2hex(random_bytes(8));
        $stmt = $pdo->prepare('INSERT INTO users (id, org_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, "admin", "active")');
        $stmt->execute([$id, $organizationId, $data['adminName'], $data['adminEmail'], password_hash((string) $data['adminPassword'], PASSWORD_DEFAULT)]);

        create_global_notification(
            $pdo,
            'Organization created',
            $data['organizationName'] . ' was created with ' . $data['adminName'] . ' as administrator',
            'user_created',
            'user',
            $id,
            'team',
            $organizationId
        );

        $organization = $pdo->prepare('SELECT * FROM organizations WHERE id = ?');
        $organization->execute([$organizationId]);
        $user = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $user->execute([$id]);
        json_response(['user' => public_user(enrich_user_with_organization($user->fetch(), $organization->fetch()))], 201);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'users') {
        $stmt = $pdo->prepare('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE org_id = ? ORDER BY name');
        $stmt->execute([$organizationId]);
        $users = $stmt->fetchAll();
        json_response(['users' => array_map('public_user', $users)]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'users' && !isset($segments[1])) {
        $data = read_json();
        require_admin_actor($data);
        require_fields($data, ['name', 'email', 'password', 'role']);

        $allowedRoles = ['admin', 'manager', 'developer', 'tester'];
        if (!in_array($data['role'], $allowedRoles, true)) {
            json_response(['message' => 'Invalid role supplied.'], 422);
            exit;
        }

        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? AND org_id = ? LIMIT 1');
        $exists->execute([$data['email'], $organizationId]);
        if ($exists->fetch()) {
            json_response(['message' => 'An account with this email already exists.'], 409);
            exit;
        }

        $id = bin2hex(random_bytes(8));
        $status = in_array($data['status'] ?? 'active', ['active', 'inactive'], true) ? $data['status'] : 'active';
        $stmt = $pdo->prepare('INSERT INTO users (id, org_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $id,
            $organizationId,
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
            'team',
            $organizationId
        );

        $user = $pdo->prepare('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE id = ? AND org_id = ?');
        $user->execute([$id, $organizationId]);
        json_response(['user' => public_user($user->fetch())], 201);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'roles') {
        json_response(['roles' => role_definitions()]);
        exit;
    }

    if ($method === 'PATCH' && ($segments[0] ?? '') === 'users' && isset($segments[1])) {
        $data = read_json();
        require_admin_actor($data);
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
        $params[] = $organizationId;
        $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ? AND org_id = ?');
        $stmt->execute($params);
        $user = $pdo->prepare('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE id = ? AND org_id = ?');
        $user->execute([$segments[1], $organizationId]);
        $updatedUser = $user->fetch();
        if (!$updatedUser) {
            json_response(['message' => 'User not found'], 404);
            exit;
        }
        create_global_notification(
            $pdo,
            'User updated',
            ($updatedUser['name'] ?? 'A user') . ' was updated to role ' . ($updatedUser['role'] ?? 'unknown') . ' and status ' . ($updatedUser['status'] ?? 'unknown'),
            'user_updated',
            'user',
            (string) ($updatedUser['id'] ?? $segments[1]),
            'team',
            $organizationId
        );
        json_response(['user' => public_user($updatedUser)]);
        exit;
    }

    if ($method === 'DELETE' && ($segments[0] ?? '') === 'users' && isset($segments[1])) {
        require_admin_actor();
        $user = $pdo->prepare('SELECT id, name, email, role, status FROM users WHERE id = ? AND org_id = ? LIMIT 1');
        $user->execute([$segments[1], $organizationId]);
        $existingUser = $user->fetch();
        if (!$existingUser) {
            json_response(['message' => 'User not found'], 404);
            exit;
        }

        $delete = $pdo->prepare('DELETE FROM users WHERE id = ? AND org_id = ?');
        $delete->execute([$segments[1], $organizationId]);

        create_global_notification(
            $pdo,
            'User deleted',
            $existingUser['name'] . ' was removed from the workspace',
            'user_deleted',
            'user',
            $segments[1],
            'team',
            $organizationId
        );

        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'users' && isset($segments[1]) && ($segments[2] ?? '') === 'password') {
        $data = read_json();
        require_fields($data, ['currentPassword', 'newPassword']);
        $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE id = ? AND org_id = ? LIMIT 1');
        $stmt->execute([$segments[1], $organizationId]);
        $target = $stmt->fetch();
        if (!$target || !password_verify((string) $data['currentPassword'], $target['password_hash'])) {
            json_response(['message' => 'Current password is incorrect.'], 422);
            exit;
        }
        $update = $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ? AND org_id = ?');
        $update->execute([password_hash((string) $data['newPassword'], PASSWORD_DEFAULT), now(), $segments[1], $organizationId]);
        $targetUser = $pdo->prepare('SELECT name FROM users WHERE id = ? AND org_id = ? LIMIT 1');
        $targetUser->execute([$segments[1], $organizationId]);
        $userRecord = $targetUser->fetch();
        create_global_notification(
            $pdo,
            'Password changed',
            ($userRecord['name'] ?? 'A user') . ' updated account security settings',
            'password_changed',
            'user',
            $segments[1],
            'settings',
            $organizationId
        );
        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'projects') {
        $stmt = $pdo->prepare('SELECT id, name, description, project_key, status, team_size, created_at, updated_at FROM projects WHERE org_id = ? ORDER BY created_at DESC');
        $stmt->execute([$organizationId]);
        $projects = $stmt->fetchAll();
        json_response(['projects' => array_map('project_record', $projects)]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'projects') {
        $data = read_json();
        require_admin_actor($data);
        require_fields($data, ['name', 'description', 'key']);
        $existingProjectStmt = $pdo->prepare('SELECT id FROM projects WHERE org_id = ? AND project_key = ? LIMIT 1');
        $existingProjectStmt->execute([$organizationId, strtoupper((string) $data['key'])]);
        if ($existingProjectStmt->fetch()) {
            json_response(['message' => 'A project with this key already exists in your organization.'], 409);
            exit;
        }
        $id = 'proj-' . bin2hex(random_bytes(4));
        $stmt = $pdo->prepare('INSERT INTO projects (id, org_id, name, description, project_key, status, team_size) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $organizationId, $data['name'], $data['description'], strtoupper((string) $data['key']), $data['status'] ?? 'active', (int) ($data['teamSize'] ?? 1)]);
        $project = $pdo->prepare('SELECT id, name, description, project_key, status, team_size, created_at, updated_at FROM projects WHERE id = ? AND org_id = ?');
        $project->execute([$id, $organizationId]);
        $createdProject = $project->fetch();
        create_global_notification(
            $pdo,
            'Project created',
            notification_project_label($createdProject) . ' was added with status ' . ($createdProject['status'] ?? 'active'),
            'project_created',
            'project',
            $id,
            'projects',
            $organizationId
        );
        json_response(['project' => project_record($createdProject)], 201);
        exit;
    }

    if ($method === 'DELETE' && ($segments[0] ?? '') === 'projects' && isset($segments[1])) {
        require_admin_actor();
        $project = $pdo->prepare('SELECT id, name, description, project_key, status, team_size, created_at, updated_at FROM projects WHERE id = ? AND org_id = ? LIMIT 1');
        $project->execute([$segments[1], $organizationId]);
        $existingProject = $project->fetch();
        if (!$existingProject) {
            json_response(['message' => 'Project not found'], 404);
            exit;
        }

        $bugIdsStmt = $pdo->prepare('SELECT id FROM bugs WHERE project_id = ? AND org_id = ?');
        $bugIdsStmt->execute([$segments[1], $organizationId]);
        $bugIds = array_map(static fn(array $row): string => (string) $row['id'], $bugIdsStmt->fetchAll());

        if ($bugIds !== []) {
            $placeholders = implode(', ', array_fill(0, count($bugIds), '?'));
            $attachmentsStmt = $pdo->prepare('SELECT file_path FROM bug_attachments WHERE bug_id IN (' . $placeholders . ')');
            $attachmentsStmt->execute($bugIds);
            $attachments = $attachmentsStmt->fetchAll();
            delete_attachment_files($attachments);

            $deleteAttachments = $pdo->prepare('DELETE FROM bug_attachments WHERE bug_id IN (' . $placeholders . ')');
            $deleteAttachments->execute($bugIds);

            $deleteComments = $pdo->prepare('DELETE FROM bug_comments WHERE bug_id IN (' . $placeholders . ')');
            $deleteComments->execute($bugIds);

            $deleteActivities = $pdo->prepare('DELETE FROM activities WHERE org_id = ? AND bug_id IN (' . $placeholders . ')');
            $deleteActivities->execute(array_merge([$organizationId], $bugIds));
            $deleteNotifications = $pdo->prepare('DELETE FROM notifications WHERE org_id = ? AND entity_type = "bug" AND entity_id IN (' . $placeholders . ')');
            $deleteNotifications->execute(array_merge([$organizationId], $bugIds));

            $deleteBugs = $pdo->prepare('DELETE FROM bugs WHERE org_id = ? AND id IN (' . $placeholders . ')');
            $deleteBugs->execute(array_merge([$organizationId], $bugIds));
        }

        $deleteProjectNotifications = $pdo->prepare('DELETE FROM notifications WHERE org_id = ? AND entity_type = "project" AND entity_id = ?');
        $deleteProjectNotifications->execute([$organizationId, $segments[1]]);

        $deleteProject = $pdo->prepare('DELETE FROM projects WHERE id = ? AND org_id = ?');
        $deleteProject->execute([$segments[1], $organizationId]);

        create_global_notification(
            $pdo,
            'Project deleted',
            notification_project_label($existingProject) . ' was removed from the workspace',
            'project_deleted',
            'project',
            $segments[1],
            'projects',
            $organizationId
        );

        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'bugs' && !isset($segments[1])) {
        $sql = 'SELECT * FROM bugs';
        $params = [];
        $conditions = ['org_id = ?'];
        $params[] = $organizationId;

        if (isset($_GET['reported_by']) && $_GET['reported_by'] !== '') {
            $conditions[] = 'reported_by = ?';
            $params[] = $_GET['reported_by'];
        }

        $actorRole = isset($_GET['actor_role']) ? strtolower((string) $_GET['actor_role']) : null;
        $actorEmail = isset($_GET['actor_email']) ? (string) $_GET['actor_email'] : null;

        if ($actorRole === 'developer' && $actorEmail) {
            $conditions[] = 'assigned_to = ?';
            $params[] = $actorEmail;
        }

        if ($actorRole === 'tester' && $actorEmail) {
            $conditions[] = '(reported_by = ? OR verification_tester_email = ?)';
            $params[] = $actorEmail;
            $params[] = $actorEmail;
        }

        if (count($conditions) > 0) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        $sql .= ' ORDER BY created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        json_response(['bugs' => array_map('bug_record', $stmt->fetchAll())]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'bugs' && isset($segments[1]) && ($segments[2] ?? '') === 'attachments') {
        $stmt = $pdo->prepare(
            'SELECT a.*
             FROM bug_attachments a
             INNER JOIN bugs b ON b.id = a.bug_id
             WHERE a.bug_id = ? AND b.org_id = ?
             ORDER BY a.created_at DESC'
        );
        $stmt->execute([$segments[1], $organizationId]);
        json_response(['attachments' => array_map('attachment_record', $stmt->fetchAll())]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'bugs' && isset($segments[1]) && ($segments[2] ?? '') === 'blockchain-events') {
        $stmt = $pdo->prepare(
            'SELECT e.*
             FROM bug_blockchain_events e
             INNER JOIN bugs b ON b.id = e.bug_id
             WHERE e.bug_id = ? AND b.org_id = ?
             ORDER BY e.created_at DESC, e.id DESC
             LIMIT 10'
        );
        $stmt->execute([$segments[1], $organizationId]);
        json_response(['events' => array_map('blockchain_event_record', $stmt->fetchAll())]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'bugs' && isset($segments[1]) && ($segments[2] ?? '') === 'blockchain-resync') {
        $data = read_json();
        $bugStmt = $pdo->prepare('SELECT id FROM bugs WHERE id = ? AND org_id = ? LIMIT 1');
        $bugStmt->execute([$segments[1], $organizationId]);
        if (!$bugStmt->fetch()) {
            json_response(['message' => 'Bug not found'], 404);
            exit;
        }

        $failedActionsStmt = $pdo->prepare(
            'SELECT action
             FROM bug_blockchain_events
             WHERE bug_id = ? AND sync_status = "failed"
             GROUP BY action
             ORDER BY MAX(created_at) DESC'
        );
        $failedActionsStmt->execute([$segments[1]]);
        $actions = array_map(
            static fn($row): string => (string) $row['action'],
            $failedActionsStmt->fetchAll()
        );

        if (count($actions) === 0) {
            json_response(['ok' => true, 'message' => 'No failed blockchain events to resync.']);
            exit;
        }

        foreach ($actions as $action) {
            replay_bug_blockchain_event($pdo, (string) $segments[1], $action);
        }

        $eventsStmt = $pdo->prepare('SELECT * FROM bug_blockchain_events WHERE bug_id = ? ORDER BY created_at DESC, id DESC LIMIT 10');
        $eventsStmt->execute([$segments[1]]);
        json_response([
            'ok' => true,
            'actions' => $actions,
            'events' => array_map('blockchain_event_record', $eventsStmt->fetchAll()),
        ]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'bugs' && !isset($segments[1])) {
        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
        $data = str_contains($contentType, 'multipart/form-data') ? $_POST : read_json();
        require_fields($data, ['title', 'description', 'projectId', 'reportedBy']);
        $reportedBy = (string) $data['reportedBy'];
        $reportedByRole = role_for_user_email($pdo, $reportedBy, $organizationId);
        if (!in_array($reportedByRole, ['manager', 'tester'], true)) {
            json_response(['message' => 'Only manager and tester accounts can create bug reports.'], 403);
            exit;
        }
        $projectStmt = $pdo->prepare('SELECT id FROM projects WHERE id = ? AND org_id = ? LIMIT 1');
        $projectStmt->execute([$data['projectId'], $organizationId]);
        if (!$projectStmt->fetch()) {
            json_response(['message' => 'Project not found for this organization.'], 404);
            exit;
        }
        $settings = system_settings($pdo);
        $priority = $data['priority'] ?? $settings['default_bug_priority'] ?? 'medium';
        $severity = $data['severity'] ?? $settings['default_bug_severity'] ?? 'major';
        $status = $data['status'] ?? $settings['default_bug_status'] ?? 'open';
        $assignedTo = $data['assignedTo'] ?? resolve_default_assignee($pdo, (string) ($settings['default_assignee_rule'] ?? 'unassigned'), $reportedBy, $organizationId);
        $verificationTesterEmail = $data['verificationTesterEmail'] ?? null;
        if ($reportedByRole === 'manager') {
            if (!$assignedTo) {
                json_response(['message' => 'A developer must be assigned when a manager creates a bug report.'], 422);
                exit;
            }
            if (!$verificationTesterEmail) {
                json_response(['message' => 'A tester must be assigned when a manager creates a bug report.'], 422);
                exit;
            }
        }
        if (!$verificationTesterEmail && $reportedByRole === 'tester') {
            $verificationTesterEmail = $reportedBy;
        }

        $id = 'bug-' . time() . '-' . bin2hex(random_bytes(3));
        $stmt = $pdo->prepare(
            'INSERT INTO bugs (id, org_id, title, description, status, priority, severity, project_id, assigned_to, reported_by, verification_tester_email, steps_to_reproduce, expected_result, actual_result, environment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $organizationId,
            $data['title'],
            $data['description'],
            $status,
            $priority,
            $severity,
            $data['projectId'],
            $assignedTo,
            $reportedBy,
            $verificationTesterEmail,
            $data['stepsToReproduce'] ?? null,
            $data['expectedResult'] ?? null,
            $data['actualResult'] ?? null,
            $data['environment'] ?? null,
        ]);

        $name = $reportedBy;
        $userStmt = $pdo->prepare('SELECT name FROM users WHERE email = ? AND org_id = ? LIMIT 1');
        $userStmt->execute([$reportedBy, $organizationId]);
        if ($user = $userStmt->fetch()) {
            $name = $user['name'];
        }

        $activity = $pdo->prepare('INSERT INTO activities (id, org_id, bug_id, type, user_id, user_name, message) VALUES (?, ?, ?, "created", ?, ?, ?)');
        $activity->execute(['act-' . bin2hex(random_bytes(6)), $organizationId, $id, $reportedBy, $name, 'Created new bug report']);

        $uploadedAttachment = null;
        if (isset($_FILES['attachment'])) {
            $uploadedAttachment = upload_bug_attachment($pdo, $id, $_FILES['attachment'], $reportedBy);
        }

        $bugLabel = strtoupper(substr($id, 0, 8)) . ' - ' . $data['title'];

        create_global_notification(
            $pdo,
            'New bug report',
            $name . ' reported ' . $bugLabel,
            'bug_created',
            'bug',
            $id,
            'bugs',
            $organizationId
        );

        if (!empty($data['assignedTo'])) {
            create_global_notification(
                $pdo,
                'Bug assigned',
                $bugLabel . ' was assigned to ' . $data['assignedTo'],
                'bug_assigned',
                'bug',
                $id,
                'bugs',
                $organizationId
            );
        }

        if (!empty($verificationTesterEmail)) {
            create_global_notification(
                $pdo,
                'Tester assigned',
                $bugLabel . ' will be verified by ' . $verificationTesterEmail,
                'tester_assigned',
                'bug',
                $id,
                'bugs',
                $organizationId
            );
        }

        record_bug_blockchain_event(
            $pdo,
            $id,
            'bug_created',
            $reportedBy,
            $reportedByRole,
            [
                'title' => (string) $data['title'],
                'projectId' => (string) $data['projectId'],
                'status' => (string) $status,
                'priority' => (string) $priority,
                'severity' => (string) $severity,
                'assignedTo' => $assignedTo,
                'verificationTesterEmail' => $verificationTesterEmail,
            ]
        );

        $bug = $pdo->prepare('SELECT * FROM bugs WHERE id = ? AND org_id = ?');
        $bug->execute([$id, $organizationId]);
        json_response([
            'bug' => bug_record($bug->fetch()),
            'attachment' => $uploadedAttachment ? attachment_record($uploadedAttachment) : null,
        ], 201);
        exit;
    }

    if ($method === 'PATCH' && ($segments[0] ?? '') === 'bugs' && isset($segments[1])) {
        $data = read_json();
        $before = $pdo->prepare('SELECT * FROM bugs WHERE id = ? AND org_id = ?');
        $before->execute([$segments[1], $organizationId]);
        $existingBug = $before->fetch();
        if (!$existingBug) {
            json_response(['message' => 'Bug not found'], 404);
            exit;
        }

        if (array_key_exists('status', $data) && $data['status'] !== $existingBug['status']) {
            $actorEmail = $data['userEmail'] ?? null;
            $actorRole = $actorEmail ? role_for_user_email($pdo, (string) $actorEmail, $organizationId) : null;
            $nextStatus = (string) $data['status'];

            if (in_array((string) $existingBug['status'], ['open', 'in-progress'], true)) {
                if (!can_developer_advance_bug($existingBug, $actorEmail ? (string) $actorEmail : null, $actorRole, $nextStatus)) {
                    json_response(['message' => 'Only the assigned developer can move this bug forward through work stages.'], 403);
                    exit;
                }
            }

            if ($existingBug['status'] === 'resolved' && ($nextStatus === 'closed' || $nextStatus === 'in-progress')) {
                if ($actorRole !== 'tester' || !can_tester_verify_bug($existingBug, $actorEmail ? (string) $actorEmail : null)) {
                    json_response(['message' => 'Only the assigned tester can verify a resolved bug.'], 403);
                    exit;
                }
            }
        }

        $allowed = ['status', 'assignedTo', 'verificationTesterEmail'];
        $sets = [];
        $params = [];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $column = match ($field) {
                    'assignedTo' => 'assigned_to',
                    'verificationTesterEmail' => 'verification_tester_email',
                    default => $field,
                };
                $sets[] = "{$column} = ?";
                $params[] = $data[$field] ?: null;
            }
        }
        if (array_key_exists('status', $data) && $data['status'] !== $existingBug['status']) {
            $sets[] = 'verified_at = ?';
            $params[] = $data['status'] === 'closed' ? now() : null;
        }
        if (!$sets) {
            json_response(['message' => 'No supported fields were provided.'], 422);
            exit;
        }
        $sets[] = 'updated_at = ?';
        $params[] = now();
        $params[] = $segments[1];
        $params[] = $organizationId;
        $stmt = $pdo->prepare('UPDATE bugs SET ' . implode(', ', $sets) . ' WHERE id = ? AND org_id = ?');
        $stmt->execute($params);

        if (array_key_exists('status', $data) && $data['status'] !== $existingBug['status']) {
            $userName = $data['userName'] ?? 'System';
            $userEmail = $data['userEmail'] ?? 'system@blockbug.dev';
            $activity = $pdo->prepare('INSERT INTO activities (id, org_id, bug_id, type, user_id, user_name, message) VALUES (?, ?, ?, "status_changed", ?, ?, ?)');
            $activity->execute(['act-' . bin2hex(random_bytes(6)), $organizationId, $segments[1], $userEmail, $userName, 'Changed status to ' . $data['status']]);
            create_global_notification(
                $pdo,
                'Status updated',
                $userName . ' moved ' . notification_bug_label($existingBug) . ' to ' . str_replace('-', ' ', (string) $data['status']),
                'status_changed',
                'bug',
                $segments[1],
                'bugs',
                $organizationId
            );
        }

        if (array_key_exists('assignedTo', $data) && $data['assignedTo'] !== ($existingBug['assigned_to'] ?? null) && !empty($data['assignedTo'])) {
            $userName = $data['userName'] ?? 'System';
            $activity = $pdo->prepare('INSERT INTO activities (id, org_id, bug_id, type, user_id, user_name, message) VALUES (?, ?, ?, "assigned", ?, ?, ?)');
            $activity->execute(['act-' . bin2hex(random_bytes(6)), $organizationId, $segments[1], $data['userEmail'] ?? 'system@blockbug.dev', $userName, 'Assigned bug to ' . $data['assignedTo']]);
            create_global_notification(
                $pdo,
                'Bug assigned',
                $userName . ' assigned ' . notification_bug_label($existingBug) . ' to ' . $data['assignedTo'],
                'bug_assigned',
                'bug',
                $segments[1],
                'bugs',
                $organizationId
            );
        }

        if (array_key_exists('verificationTesterEmail', $data) && $data['verificationTesterEmail'] !== ($existingBug['verification_tester_email'] ?? null) && !empty($data['verificationTesterEmail'])) {
            $userName = $data['userName'] ?? 'System';
            create_global_notification(
                $pdo,
                'Tester assigned',
                $userName . ' assigned ' . notification_bug_label($existingBug) . ' to tester ' . $data['verificationTesterEmail'],
                'tester_assigned',
                'bug',
                $segments[1],
                'bugs',
                $organizationId
            );
        }

        $bug = $pdo->prepare('SELECT * FROM bugs WHERE id = ? AND org_id = ?');
        $bug->execute([$segments[1], $organizationId]);
        $updatedBug = $bug->fetch();

        if (array_key_exists('status', $data) && $data['status'] !== $existingBug['status']) {
            $actorEmail = isset($data['userEmail']) ? (string) $data['userEmail'] : null;
            $actorRole = $actorEmail ? role_for_user_email($pdo, $actorEmail, $organizationId) : null;
            $blockchainAction = 'bug_status_changed';

            if ($existingBug['status'] === 'resolved' && $data['status'] === 'closed') {
                $blockchainAction = 'bug_verified';
            } elseif ($existingBug['status'] === 'resolved' && $data['status'] === 'in-progress') {
                $blockchainAction = 'bug_verification_rejected';
            }

            record_bug_blockchain_event(
                $pdo,
                (string) $segments[1],
                $blockchainAction,
                $actorEmail,
                $actorRole,
                [
                    'title' => (string) ($existingBug['title'] ?? ''),
                    'fromStatus' => (string) $existingBug['status'],
                    'toStatus' => (string) $data['status'],
                    'assignedTo' => $updatedBug['assigned_to'] ?? null,
                    'verificationTesterEmail' => $updatedBug['verification_tester_email'] ?? null,
                ]
            );
        }

        json_response(['bug' => bug_record($updatedBug)]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'bugs' && isset($segments[1]) && ($segments[2] ?? '') === 'comments') {
        $stmt = $pdo->prepare(
            'SELECT c.*
             FROM bug_comments c
             INNER JOIN bugs b ON b.id = c.bug_id
             WHERE c.bug_id = ? AND b.org_id = ?
             ORDER BY c.created_at ASC'
        );
        $stmt->execute([$segments[1], $organizationId]);
        json_response(['comments' => array_map('comment_record', $stmt->fetchAll())]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'bugs' && isset($segments[1]) && ($segments[2] ?? '') === 'comments') {
        $data = read_json();
        require_fields($data, ['comment', 'userEmail', 'userName']);
        $bugOwnershipStmt = $pdo->prepare('SELECT id, title, reported_by, assigned_to FROM bugs WHERE id = ? AND org_id = ? LIMIT 1');
        $bugOwnershipStmt->execute([$segments[1], $organizationId]);
        $ownedBug = $bugOwnershipStmt->fetch();
        if (!$ownedBug) {
            json_response(['message' => 'Bug not found'], 404);
            exit;
        }
        $id = 'comment-' . bin2hex(random_bytes(6));
        $parentCommentId = $data['parentCommentId'] ?? null;
        if ($parentCommentId) {
            $parentStmt = $pdo->prepare('SELECT id, bug_id, user_name FROM bug_comments WHERE id = ? LIMIT 1');
            $parentStmt->execute([$parentCommentId]);
            $parentComment = $parentStmt->fetch();
            if (!$parentComment || $parentComment['bug_id'] !== $segments[1]) {
                json_response(['message' => 'Reply target not found for this bug.'], 422);
                exit;
            }
        }
        $stmt = $pdo->prepare('INSERT INTO bug_comments (id, bug_id, parent_comment_id, user_email, user_name, comment) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $segments[1], $parentCommentId, $data['userEmail'], $data['userName'], $data['comment']]);
        $activity = $pdo->prepare('INSERT INTO activities (id, org_id, bug_id, type, user_id, user_name, message) VALUES (?, ?, ?, "commented", ?, ?, ?)');
        $activity->execute(['act-' . bin2hex(random_bytes(6)), $organizationId, $segments[1], $data['userEmail'], $data['userName'], $parentCommentId ? 'Replied to a comment' : 'Added a comment']);

        if ($ownedBug) {
            $bugCode = strtoupper(substr((string) $ownedBug['id'], 0, 8));
            create_global_notification(
                $pdo,
                ($parentCommentId ? 'Reply on ' : 'Comment on ') . $bugCode,
                $data['userName'] . ': "' . notification_text_preview((string) $data['comment']) . '"',
                $parentCommentId ? 'comment_reply' : 'comment_added',
                'bug',
                $segments[1],
                'bugs',
                $organizationId
            );
        }

        $comment = $pdo->prepare('SELECT * FROM bug_comments WHERE id = ?');
        $comment->execute([$id]);
        json_response(['comment' => comment_record($comment->fetch())], 201);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'activities') {
        $stmt = $pdo->prepare('SELECT * FROM activities WHERE org_id = ? ORDER BY created_at DESC LIMIT 20');
        $stmt->execute([$organizationId]);
        $activities = $stmt->fetchAll();
        json_response(['activities' => array_map('activity_record', $activities)]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'notifications') {
        $email = $_GET['user_email'] ?? null;
        if ($email) {
            $stmt = $pdo->prepare('SELECT * FROM notifications WHERE org_id = ? AND (user_email IS NULL OR user_email = ?) ORDER BY created_at DESC LIMIT 20');
            $stmt->execute([$organizationId, $email]);
            $notifications = $stmt->fetchAll();
            $preferences = preferences_for_user_email($pdo, (string) $email, $organizationId);
            $notifications = array_values(array_filter(
                $notifications,
                static fn(array $notification): bool => should_include_notification_for_preferences($notification, $preferences)
            ));

            if ($preferences['daily_digest'] ?? true) {
                $digest = build_daily_digest_notification($pdo, (string) $email, $organizationId);
                if ($digest) {
                    array_unshift($notifications, $digest);
                }
            }

            json_response(['notifications' => array_map('notification_record', array_slice($notifications, 0, 20))]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM notifications WHERE org_id = ? ORDER BY created_at DESC LIMIT 20');
            $stmt->execute([$organizationId]);
            json_response(['notifications' => array_map('notification_record', $stmt->fetchAll())]);
        }
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'preferences') {
        $userId = $_GET['user_id'] ?? '';
        $userScopeStmt = $pdo->prepare('SELECT id FROM users WHERE id = ? AND org_id = ? LIMIT 1');
        $userScopeStmt->execute([$userId, $organizationId]);
        if (!$userScopeStmt->fetch()) {
            json_response(['preferences' => [
                'email_notifications' => true,
                'bug_assigned' => true,
                'comment_notifications' => true,
                'daily_digest' => true,
            ]]);
            exit;
        }
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
        $userScopeStmt = $pdo->prepare('SELECT id FROM users WHERE id = ? AND org_id = ? LIMIT 1');
        $userScopeStmt->execute([$data['userId'], $organizationId]);
        if (!$userScopeStmt->fetch()) {
            json_response(['message' => 'User not found'], 404);
            exit;
        }
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
        require_admin_actor($data);
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
        $userScopeStmt = $pdo->prepare('SELECT id FROM users WHERE id = ? AND org_id = ? LIMIT 1');
        $userScopeStmt->execute([$userId, $organizationId]);
        if (!$userScopeStmt->fetch()) {
            json_response(['apiKeys' => []]);
            exit;
        }
        $stmt = $pdo->prepare('SELECT id, user_id, key_label, key_prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC');
        $stmt->execute([$userId]);
        json_response(['apiKeys' => array_map('api_key_record', $stmt->fetchAll())]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'api-keys') {
        $data = read_json();
        require_fields($data, ['userId']);
        $userScopeStmt = $pdo->prepare('SELECT name FROM users WHERE id = ? AND org_id = ? LIMIT 1');
        $userScopeStmt->execute([$data['userId'], $organizationId]);
        $scopedUser = $userScopeStmt->fetch();
        if (!$scopedUser) {
            json_response(['message' => 'User not found'], 404);
            exit;
        }
        $plain = 'bb_live_' . bin2hex(random_bytes(12));
        $id = 'key-' . bin2hex(random_bytes(6));
        $stmt = $pdo->prepare('INSERT INTO api_keys (id, user_id, key_label, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$id, $data['userId'], $data['label'] ?? 'Generated key', substr($plain, 0, 16), password_hash($plain, PASSWORD_DEFAULT)]);
        $key = $pdo->prepare('SELECT id, user_id, key_label, key_prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE id = ?');
        $key->execute([$id]);
        create_global_notification(
            $pdo,
            'API key generated',
            ($scopedUser['name'] ?? 'A user') . ' generated a new API key',
            'api_key_created',
            'user',
            $data['userId'],
            'settings',
            $organizationId
        );
        json_response(['apiKey' => api_key_record($key->fetch()), 'plainKey' => $plain], 201);
        exit;
    }

    if ($method === 'DELETE' && ($segments[0] ?? '') === 'api-keys' && isset($segments[1])) {
        $stmt = $pdo->prepare(
            'UPDATE api_keys
             SET revoked_at = ?
             WHERE id = ?
             AND user_id IN (SELECT id FROM users WHERE org_id = ?)'
        );
        $stmt->execute([now(), $segments[1], $organizationId]);
        create_global_notification(
            $pdo,
            'API key revoked',
            'An API key was revoked',
            'api_key_revoked',
            'system',
            $segments[1],
            'settings',
            $organizationId
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
        $stmt = $pdo->prepare("SELECT DATE(created_at) AS day, COUNT(*) AS total FROM bugs WHERE org_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at)");
        $stmt->execute([$organizationId]);
        foreach ($stmt->fetchAll() as $row) {
            if (isset($days[$row['day']])) {
                $days[$row['day']] = (int) $row['total'];
            }
        }

        $currentWeekStmt = $pdo->prepare("SELECT COUNT(*) FROM bugs WHERE org_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $currentWeekStmt->execute([$organizationId]);
        $currentWeek = (int) $currentWeekStmt->fetchColumn();
        $previousWeekStmt = $pdo->prepare("SELECT COUNT(*) FROM bugs WHERE org_id = ? AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)");
        $previousWeekStmt->execute([$organizationId]);
        $previousWeek = (int) $previousWeekStmt->fetchColumn();
        $activeUsersStmt = $pdo->prepare('SELECT id, name, email, role, status, avatar, created_at, updated_at FROM users WHERE org_id = ? AND status = "active" ORDER BY name LIMIT 5');
        $activeUsersStmt->execute([$organizationId]);
        $activeUsers = $activeUsersStmt->fetchAll();
        $openBugsStmt = $pdo->prepare('SELECT COUNT(*) FROM bugs WHERE org_id = ? AND status = "open"');
        $openBugsStmt->execute([$organizationId]);
        $analyticsReportsStmt = $pdo->prepare('SELECT COUNT(*) FROM bugs WHERE org_id = ?');
        $analyticsReportsStmt->execute([$organizationId]);
        $pendingVerificationStmt = $pdo->prepare('SELECT COUNT(*) FROM bugs WHERE org_id = ? AND status = "resolved" AND verified_at IS NULL');
        $pendingVerificationStmt->execute([$organizationId]);
        $teamMembersStmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE org_id = ? AND status = "active"');
        $teamMembersStmt->execute([$organizationId]);

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
                'openBugs' => (int) $openBugsStmt->fetchColumn(),
                'analyticsReports' => (int) $analyticsReportsStmt->fetchColumn(),
                'pendingVerification' => (int) $pendingVerificationStmt->fetchColumn(),
                'teamMembers' => (int) $teamMembersStmt->fetchColumn(),
            ],
        ]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'maintenance' && ($segments[1] ?? '') === 'export') {
        require_admin_actor();
        $usersStmt = $pdo->prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE org_id = ? ORDER BY name');
        $usersStmt->execute([$organizationId]);
        $projectsStmt = $pdo->prepare('SELECT id, name, description, project_key, status, team_size, created_at, updated_at FROM projects WHERE org_id = ? ORDER BY created_at DESC');
        $projectsStmt->execute([$organizationId]);
        $bugsStmt = $pdo->prepare('SELECT * FROM bugs WHERE org_id = ? ORDER BY created_at DESC');
        $bugsStmt->execute([$organizationId]);
        json_response([
            'generatedAt' => now(),
            'organizationId' => $organizationId,
            'users' => $usersStmt->fetchAll(),
            'projects' => $projectsStmt->fetchAll(),
            'bugs' => $bugsStmt->fetchAll(),
            'reports' => [
                'stats' => bug_stats($pdo, $organizationId),
                'settings' => system_settings($pdo),
            ],
        ]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'maintenance' && ($segments[1] ?? '') === 'clear-data') {
        $data = read_json();
        require_admin_actor($data);
        $target = $data['target'] ?? 'all';
        if ($target === 'notifications' || $target === 'all') {
            $stmt = $pdo->prepare('DELETE FROM notifications WHERE org_id = ?');
            $stmt->execute([$organizationId]);
        }
        if ($target === 'activity' || $target === 'all') {
            $stmt = $pdo->prepare('DELETE FROM activities WHERE org_id = ?');
            $stmt->execute([$organizationId]);
        }
        if ($target !== 'notifications' && $target !== 'all') {
            create_global_notification(
                $pdo,
                'Maintenance action',
                'Maintenance cleared ' . $target . ' data',
                'maintenance_action',
                'system',
                $target,
                'settings',
                $organizationId
            );
        }
        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'POST' && ($segments[0] ?? '') === 'maintenance' && ($segments[1] ?? '') === 'reset-demo') {
        require_admin_actor(read_json());
        if ($organizationId !== 'org-deepixel') {
            json_response(['message' => 'Demo reset is only available for the default demo organization.'], 403);
            exit;
        }
        $existingAttachments = $pdo->query('SELECT file_path FROM bug_attachments')->fetchAll();
        delete_attachment_files($existingAttachments);
        $pdo->exec('DELETE FROM bug_attachments');
        run_seed($pdo);
        create_global_notification(
            $pdo,
            'Demo data reset',
            'The workspace was reset to demo data',
            'demo_reset',
            'system',
            'demo',
            'settings',
            $organizationId
        );
        json_response(['ok' => true]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'stats') {
        json_response(['stats' => bug_stats($pdo, $organizationId)]);
        exit;
    }

    if ($method === 'GET' && ($segments[0] ?? '') === 'reports') {
        $priorityStmt = $pdo->prepare('SELECT priority, COUNT(*) AS total FROM bugs WHERE org_id = ? GROUP BY priority');
        $priorityStmt->execute([$organizationId]);
        $priorityRows = $priorityStmt->fetchAll();
        $priorities = ['critical' => 0, 'high' => 0, 'medium' => 0, 'low' => 0];
        foreach ($priorityRows as $row) {
            $priorities[$row['priority']] = (int) $row['total'];
        }

        $totalBugsStmt = $pdo->prepare('SELECT COUNT(*) FROM bugs WHERE org_id = ?');
        $totalBugsStmt->execute([$organizationId]);
        $activeProjectsStmt = $pdo->prepare('SELECT COUNT(*) FROM projects WHERE org_id = ? AND status = "active"');
        $activeProjectsStmt->execute([$organizationId]);
        $totalProjectsStmt = $pdo->prepare('SELECT COUNT(*) FROM projects WHERE org_id = ?');
        $totalProjectsStmt->execute([$organizationId]);
        $summary = [
            'totalBugs' => (int) $totalBugsStmt->fetchColumn(),
            'activeProjects' => (int) $activeProjectsStmt->fetchColumn(),
            'totalProjects' => (int) $totalProjectsStmt->fetchColumn(),
        ];
        $summary['avgBugsPerProject'] = $summary['totalProjects'] > 0
            ? round($summary['totalBugs'] / $summary['totalProjects'], 1)
            : 0;

        $projectRowsStmt = $pdo->prepare(
            'SELECT p.name, COALESCE(AVG(CASE WHEN b.verified_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, b.created_at, b.verified_at) / 24 END), 0) AS avg_days
             FROM projects p
             LEFT JOIN bugs b ON b.project_id = p.id AND b.org_id = p.org_id
             WHERE p.org_id = ?
             GROUP BY p.id, p.name
             ORDER BY p.created_at ASC'
        );
        $projectRowsStmt->execute([$organizationId]);
        $projectRows = $projectRowsStmt->fetchAll();

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
