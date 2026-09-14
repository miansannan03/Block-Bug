#!/bin/sh
set -eu

cd /app

mkdir -p public/uploads/bugs

php database/migrate.php

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  php database/bootstrap_demo.php
fi

exec php -S 0.0.0.0:"${PORT:-10000}" -t public router.php
