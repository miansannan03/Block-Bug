<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/seed_data.php';

$pdo = db();

$count = 0;

try {
    $count = (int) $pdo->query('SELECT COUNT(*) FROM organizations')->fetchColumn();
} catch (Throwable $exception) {
    $count = 0;
}

if ($count > 0) {
    echo "Skipping demo seed because organizations already exist.\n";
    exit(0);
}

run_seed($pdo);
echo "Seeded BlockBug demo data.\n";
