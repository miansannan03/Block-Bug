<?php

declare(strict_types=1);

function starts_with(string $haystack, string $needle): bool
{
    return strpos($haystack, $needle) === 0;
}

function contains_text(string $haystack, string $needle): bool
{
    return strpos($haystack, $needle) !== false;
}

function env_value(string $key, ?string $default = null): ?string
{
    static $loaded = false;
    static $values = [];

    if (!$loaded) {
        $loaded = true;
        $envFile = __DIR__ . '/.env';
        if (is_file($envFile)) {
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || starts_with($line, '#') || !contains_text($line, '=')) {
                    continue;
                }

                [$name, $value] = explode('=', $line, 2);
                $values[trim($name)] = trim($value);
            }
        }
    }

    return $_ENV[$key] ?? getenv($key) ?: $values[$key] ?? $default;
}

function database_config(): array
{
    $databaseUrl = env_value('DATABASE_URL');
    if ($databaseUrl) {
        $parts = parse_url($databaseUrl);
        if (is_array($parts)) {
            return [
                'host' => isset($parts['host']) ? (string) $parts['host'] : env_value('DB_HOST', '127.0.0.1'),
                'port' => isset($parts['port']) ? (string) $parts['port'] : env_value('DB_PORT', '3306'),
                'database' => isset($parts['path']) ? ltrim((string) $parts['path'], '/') : env_value('DB_DATABASE', 'blockbug'),
                'username' => isset($parts['user']) ? urldecode((string) $parts['user']) : env_value('DB_USERNAME', 'root'),
                'password' => isset($parts['pass']) ? urldecode((string) $parts['pass']) : env_value('DB_PASSWORD', ''),
            ];
        }
    }

    return [
        'host' => env_value('DB_HOST', '127.0.0.1'),
        'port' => env_value('DB_PORT', '3306'),
        'database' => env_value('DB_DATABASE', 'blockbug'),
        'username' => env_value('DB_USERNAME', 'root'),
        'password' => env_value('DB_PASSWORD', ''),
    ];
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $databaseConfig = database_config();
    $host = $databaseConfig['host'];
    $port = $databaseConfig['port'];
    $database = $databaseConfig['database'];
    $username = $databaseConfig['username'];
    $password = $databaseConfig['password'];

    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function db_server(): PDO
{
    $databaseConfig = database_config();
    $dsn = "mysql:host={$databaseConfig['host']};port={$databaseConfig['port']};charset=utf8mb4";

    return new PDO($dsn, $databaseConfig['username'], $databaseConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function ensure_database_exists(): void
{
    $database = database_config()['database'];
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $database)) {
        throw new RuntimeException('Invalid database name.');
    }

    db_server()->exec(
        "CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
}

function json_response($payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload, JSON_THROW_ON_ERROR);
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function require_fields(array $data, array $fields): void
{
    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
            json_response(['message' => "The {$field} field is required."], 422);
            exit;
        }
    }
}

function camelize_record(array $record): array
{
    $mapped = [];
    foreach ($record as $key => $value) {
        $camel = preg_replace_callback('/_([a-z])/', fn ($m) => strtoupper($m[1]), $key);
        $mapped[$camel] = $value;
    }

    return $mapped;
}

function now(): string
{
    return date('Y-m-d H:i:s');
}
