#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

if [[ $# -ne 4 ]]; then
    echo "Usage: deploy.sh APP_PATH PUBLIC_PATH PHP_BINARY COMPOSER_BINARY" >&2
    exit 64
fi

APP_PATH=$1
PUBLIC_PATH=$2
PHP_BINARY=$3
COMPOSER_BINARY=$4
MAINTENANCE_ENABLED=false

fail() {
    echo "Deployment failed: $*" >&2
    exit 1
}

validate_directory() {
    local label=$1 path=$2 resolved parent
    [[ "$path" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "$label is not a safe absolute path."
    resolved=$(realpath -m -- "$path")
    [[ "$resolved" == "$path" ]] || fail "$label must already be canonical."
    parent=$(dirname -- "$resolved")
    [[ "$resolved" != / && "$resolved" != "$HOME" && "$parent" != / ]] || \
        fail "$label resolves to a protected broad location."
    [[ -d "$resolved" && -w "$resolved" ]] || \
        fail "$label must exist and be writable by the SSH user."
}

restore_service() {
    local status=$?
    trap - EXIT
    if [[ "$MAINTENANCE_ENABLED" == true && -f "$APP_PATH/artisan" ]]; then
        "$PHP_BINARY" "$APP_PATH/artisan" up >/dev/null 2>&1 || {
            echo "WARNING: Laravel could not be taken out of maintenance mode." >&2
            status=1
        }
    fi
    exit "$status"
}
trap restore_service EXIT

for command_name in sed grep find realpath ln chmod mkdir mv rm rmdir awk; do
    command -v "$command_name" >/dev/null || fail "Required command is missing: $command_name"
done

validate_directory APP_PATH "$APP_PATH"
validate_directory PUBLIC_PATH "$PUBLIC_PATH"
[[ "$APP_PATH" != "$PUBLIC_PATH" ]] || fail "Deployment paths must be different."
[[ "$PUBLIC_PATH/" != "$APP_PATH/"* && "$APP_PATH/" != "$PUBLIC_PATH/"* ]] || \
    fail "APP_PATH and PUBLIC_PATH must not contain one another."
[[ -f "$APP_PATH/.blockbug-app-root" ]] || fail "APP_PATH safety marker is missing."
[[ -f "$PUBLIC_PATH/.blockbug-public-root" ]] || fail "PUBLIC_PATH safety marker is missing."
[[ -f "$APP_PATH/.env" ]] || fail "The server-managed APP_PATH/.env file is missing."
[[ -f "$APP_PATH/artisan" && -f "$APP_PATH/composer.lock" ]] || \
    fail "APP_PATH does not contain the BlockBug Laravel application."
[[ "$PHP_BINARY" =~ ^/[A-Za-z0-9._/-]+$ && -x "$PHP_BINARY" ]] || \
    fail "PHP_BINARY is not an executable absolute path."
[[ "$COMPOSER_BINARY" =~ ^/[A-Za-z0-9._/-]+$ && -r "$COMPOSER_BINARY" ]] || \
    fail "COMPOSER_BINARY is not a readable absolute path."

index_file="$PUBLIC_PATH/index.php"
[[ -f "$index_file" ]] || fail "The synchronized Laravel public index.php is missing."

# Every deployment uploads a fresh Laravel index.php. Convert its three standard
# relative references to the private application path, then verify the result.
relative_reference="__DIR__.'/../"
reference_count=$(awk -v needle="$relative_reference" '
    {
        line = $0
        while ((position = index(line, needle)) > 0) {
            count++
            line = substr(line, position + length(needle))
        }
    }
    END { print count + 0 }
' "$index_file")
if [[ "$reference_count" == 3 ]]; then
    patched_index="$PUBLIC_PATH/.index.php.blockbug-new"
    sed "s|__DIR__.'/../|'$APP_PATH/|g" "$index_file" > "$patched_index"
    chmod 0644 "$patched_index"
    mv -f -- "$patched_index" "$index_file"
elif [[ "$reference_count" != 0 ]]; then
    fail "Unexpected Laravel index.php structure; refusing a partial path patch."
fi

grep -Fq "'$APP_PATH/storage/framework/maintenance.php'" "$index_file" || \
    fail "Patched maintenance-file reference is invalid."
grep -Fq "'$APP_PATH/vendor/autoload.php'" "$index_file" || \
    fail "Patched Composer autoloader reference is invalid."
grep -Fq "'$APP_PATH/bootstrap/app.php'" "$index_file" || \
    fail "Patched Laravel bootstrap reference is invalid."

mkdir -p \
    "$APP_PATH/storage/framework/cache/data" \
    "$APP_PATH/storage/framework/sessions" \
    "$APP_PATH/storage/framework/views" \
    "$APP_PATH/storage/logs" \
    "$APP_PATH/storage/app/private" \
    "$APP_PATH/storage/app/public" \
    "$APP_PATH/bootstrap/cache" \
    "$PUBLIC_PATH/uploads/bugs"

find "$APP_PATH/storage" "$APP_PATH/bootstrap/cache" -type d -exec chmod 0775 {} +
find "$APP_PATH/storage" "$APP_PATH/bootstrap/cache" -type f -exec chmod 0664 {} +
find "$PUBLIC_PATH/uploads" -type d -exec chmod 0775 {} +
find "$PUBLIC_PATH/uploads" -type f -exec chmod 0664 {} +

if [[ -e "$APP_PATH/public" && ! -L "$APP_PATH/public" ]]; then
    fail "APP_PATH/public exists but is not the expected symlink."
fi
ln -sfn "$PUBLIC_PATH" "$APP_PATH/public"
[[ "$(realpath -- "$APP_PATH/public")" == "$PUBLIC_PATH" ]] || \
    fail "APP_PATH/public does not resolve to PUBLIC_PATH."

storage_link="$PUBLIC_PATH/storage"
if [[ -L "$storage_link" ]]; then
    rm -f -- "$storage_link"
elif [[ -e "$storage_link" ]]; then
    rmdir -- "$storage_link" 2>/dev/null || \
        fail "PUBLIC_PATH/storage exists and is not an empty directory or symlink."
fi
ln -s "$APP_PATH/storage/app/public" "$storage_link"
[[ "$(realpath -- "$storage_link")" == "$APP_PATH/storage/app/public" ]] || \
    fail "The public storage symlink is invalid."

cd "$APP_PATH"

if [[ -f vendor/autoload.php ]]; then
    "$PHP_BINARY" artisan down --retry=15 >/dev/null
    MAINTENANCE_ENABLED=true
    "$PHP_BINARY" artisan config:clear
    "$PHP_BINARY" artisan route:clear
    "$PHP_BINARY" artisan view:clear
    "$PHP_BINARY" artisan event:clear
fi

"$PHP_BINARY" "$COMPOSER_BINARY" install \
    --no-interaction \
    --no-dev \
    --prefer-dist \
    --optimize-autoloader \
    --no-progress
[[ -f vendor/autoload.php ]] || fail "Composer did not create vendor/autoload.php."
"$PHP_BINARY" "$COMPOSER_BINARY" check-platform-reqs --no-dev

"$PHP_BINARY" artisan config:clear
"$PHP_BINARY" artisan route:clear
"$PHP_BINARY" artisan view:clear
"$PHP_BINARY" artisan event:clear
"$PHP_BINARY" artisan clear-compiled
"$PHP_BINARY" <<'PHP' || fail "Production .env validation failed; verify APP_ENV, APP_KEY, APP_DEBUG, QUEUE_CONNECTION, CACHE_STORE, and SESSION_DRIVER."
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$key = config('app.key');
$valid = config('app.env') === 'production'
    && config('app.debug') === false
    && is_string($key)
    && strlen($key) > 20
    && config('queue.default') === 'sync'
    && config('cache.default') === 'file'
    && config('session.driver') === 'file';
exit($valid ? 0 : 1);
PHP
"$PHP_BINARY" artisan migrate --force
"$PHP_BINARY" artisan route:list --path=api/health >/dev/null

# Config and route caches intentionally remain disabled because shared-hosting
# CLI and web PHP environments can differ. The HTTP check validates web PHP.
