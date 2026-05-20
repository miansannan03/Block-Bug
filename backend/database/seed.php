<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/seed_data.php';

$pdo = db();

try {
    run_seed($pdo);

    echo "Seeded BlockBug demo data.\n";
} catch (Throwable $exception) {
    throw $exception;
}
