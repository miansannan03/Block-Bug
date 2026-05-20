<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

try {
    ensure_database_exists();
} catch (Throwable $exception) {
    // Shared hosts like InfinityFree usually provide a pre-created database
    // and do not allow CREATE DATABASE for the site user.
}
$pdo = db();
$pdo->exec(
    "CREATE TABLE IF NOT EXISTS migrations (
        migration VARCHAR(255) PRIMARY KEY,
        ran_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

$ran = $pdo->query('SELECT migration FROM migrations')->fetchAll(PDO::FETCH_COLUMN);
$ran = array_flip($ran);
$files = glob(__DIR__ . '/migrations/*.sql') ?: [];
sort($files);

foreach ($files as $file) {
    $name = basename($file);
    if (isset($ran[$name])) {
        echo "Skipping {$name}\n";
        continue;
    }

    $sql = file_get_contents($file);
    if ($sql === false) {
        throw new RuntimeException("Could not read {$name}");
    }

    try {
        $pdo->exec($sql);
        $stmt = $pdo->prepare('INSERT INTO migrations (migration) VALUES (?)');
        $stmt->execute([$name]);
        echo "Migrated {$name}\n";
    } catch (Throwable $exception) {
        throw $exception;
    }
}

echo "Migrations complete.\n";
