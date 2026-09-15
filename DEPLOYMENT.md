# BlockBug production deployment

BlockBug is deployed by one manually triggered GitHub Actions workflow. The
root React/Vite frontend is built on the GitHub runner, while Composer installs
the Laravel 12 dependencies on the production server.

The deployment uses two separate server locations:

- `APP_PATH`: private Laravel application directory. It contains the contents
  of `laravel-api/`, `vendor/`, `storage/`, and the server-managed `.env`.
- `PUBLIC_PATH`: the domain's document root. It contains the Vite `dist/`
  output plus Laravel's public `index.php` and `.htaccess`.

The workflow patches the deployed PHP front controller to load Laravel from
`APP_PATH`. Apache serves real static files directly, sends `/api/*` and `/up`
to Laravel, and sends all other application routes to the React `index.html`.

## GitHub configuration

Create a GitHub Environment named `production`, then add all of these as
Environment secrets (Repository secrets also work, but Environment secrets are
recommended):

| Secret | Required value |
| --- | --- |
| `SSH_PRIVATE_KEY` | Full unencrypted OpenSSH private key for a dedicated deployment user. |
| `SSH_HOST` | SSH hostname without a scheme or port. It is also used as the production HTTPS hostname for the health check. |
| `SSH_PORT` | SSH port, normally `22`. |
| `SSH_USER` | SSH deployment username. |
| `APP_PATH` | Canonical absolute private Laravel path, for example `/home/account/apps/blockbug`. Do not use a home directory or document root. |
| `DB_DATABASE` | Production MySQL database name. |
| `DB_USERNAME` | Production MySQL username. |
| `DB_PASSWORD` | Production MySQL password. |

No secrets are required for the public path, PHP, Composer, frontend API URL,
or health URL. The workflow uses the SSH account's `$HOME/public_html`, selects
the first compatible PHP 8.2+ and Composer installation, builds the frontend
with `/api`, and checks `https://SSH_HOST/api/health`.

Because `SSH_KNOWN_HOSTS` was intentionally removed, the workflow obtains the
server key with `ssh-keyscan` and then uses strict checking for the connection.
This is trust-on-first-use: it is simpler, but it cannot detect a man-in-the-
middle attack during that scan. GitHub logs a warning on every deployment.

The `production` Environment should require the desired reviewers and restrict
deployments to the real production branch. The repository does not currently
declare which branch is production; the working branch `sannan2.0` has not been
assumed to be production. Merge the workflow into the repository's default
branch so that GitHub displays it under **Actions > Deploy production > Run
workflow**, then select the permitted production ref.

The workflow is manual-only and has `contents: read` permission. Its concurrency
group permits only one production deployment at a time.

## One-time server preparation

The workflow now performs first-deployment setup automatically: it creates
`APP_PATH` and `$HOME/public_html`, writes both safety markers, generates a
random permanent Laravel `APP_KEY`, and creates `.env` from the database
secrets. If a non-empty `.env` already exists, it is preserved unchanged.

The equivalent manual preparation, useful for checking permissions beforehand,
is:

```bash
APP_PATH=/home/account/apps/blockbug
PUBLIC_PATH=/home/account/public_html

mkdir -p "$APP_PATH" "$PUBLIC_PATH"
touch "$APP_PATH/.blockbug-app-root"
touch "$PUBLIC_PATH/.blockbug-public-root"
touch "$APP_PATH/.env"
chmod 600 "$APP_PATH/.env"
chmod 755 "$APP_PATH" "$PUBLIC_PATH"
```

The generated `APP_PATH/.env` has mode `600` and contains these settings:

```dotenv
APP_NAME=BlockBug
APP_ENV=production
APP_KEY=base64:GENERATE_A_REAL_KEY_ONCE
APP_DEBUG=false
APP_URL=https://your-domain.example
FRONTEND_URL=https://your-domain.example
APP_MAINTENANCE_DRIVER=file

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=<DB_DATABASE secret>
DB_USERNAME=<DB_USERNAME secret>
DB_PASSWORD=<DB_PASSWORD secret>

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
LOG_CHANNEL=stack
LOG_LEVEL=warning
```

The generated `APP_KEY` is not replaced on later deployments. Database
credentials are used by CI only for the first `.env` creation; temporary local
and remote payload files are mode `600` and deleted. Mail credentials, cloud
keys, and any later server-only settings should be edited directly in this
persistent file. CI does not overwrite a non-empty `.env`.

Create the MySQL database and restricted database user in cPanel before the
first run, and put those credentials in `.env`. The workflow runs the committed
migration to create the BlockBug schema in a fresh database. Back up and audit
an existing database before pointing production at it.

The SSH user must own or be able to write both deployment paths. The web-server
user must be able to traverse `APP_PATH` and write Laravel's `storage/`,
`bootstrap/cache/`, and `PUBLIC_PATH/uploads/`. The remote script applies `775`
to those runtime directories, not to the whole application.

Install and enable:

- Bash, rsync, sed, awk, grep, find, realpath, and Composer
- PHP 8.2 or newer
- PHP extensions `ctype`, `dom`, `fileinfo`, `filter`, `hash`, `iconv`, `json`,
  `libxml`, `mbstring`, `openssl`, `pcre`, `session`, `tokenizer`, `PDO`, and
  `pdo_mysql`
- Apache `mod_rewrite`, `AllowOverride` for `PUBLIC_PATH`, and symlink support

The application permits individual bug attachments up to 10 MiB. In cPanel's
MultiPHP INI Editor (or the active PHP handler), use at least
`upload_max_filesize=12M`, `post_max_size=13M`, `memory_limit=256M`,
`max_execution_time=120`, and `max_file_uploads=20`. No `.user.ini` is committed
because the repository cannot determine which production PHP handler is active;
an existing server-managed `PUBLIC_PATH/.user.ini` is protected from deletion.

Point the production domain's document root directly at `PUBLIC_PATH`. Do not
point it at `APP_PATH` and do not append `/public`. Configure DNS and SSL in the
hosting control panel before the first health check. HTTPS and canonical-host
redirects are intentionally handled by the host/CDN, not `.htaccess`, to avoid
conflicts with cPanel, Cloudflare, or another reverse proxy.

## What one deployment does

1. Checks out the selected ref and installs root dependencies with `npm ci`
   under Node.js 22.
2. Runs `npm run lint`, then `npm run build` with `VITE_API_URL=/api`. The
   expected output is `dist/index.html` plus files under `dist/assets/`.
3. Combines `dist/` with `laravel-api/public/` in a runner-only staging folder.
4. Scans the SSH host key and discovers `$HOME/public_html` and PHP. It uses an
   existing compatible Composer installation or securely provisions Composer 2
   under `$HOME/.local/bin` after verifying the official installer checksum.
   It then bootstraps the production paths and `.env` when missing and
   preflights safety markers, write access, extensions, and configuration.
5. Synchronizes private Laravel code to `APP_PATH` and the composed document
   root to `PUBLIC_PATH`.
6. Patches `PUBLIC_PATH/index.php`, creates runtime directories, links
   `APP_PATH/public` to `PUBLIC_PATH`, and links `PUBLIC_PATH/storage` to
   `APP_PATH/storage/app/public`.
7. Uses Laravel maintenance mode on upgrades, runs Composer, clears stale
   framework caches, and runs `php artisan migrate --force`.
8. Checks the production root for the React application shell, then calls
   `https://SSH_HOST/api/health`, which checks Laravel and its database.

The remote Composer command is:

```bash
"$PHP_BINARY" "$COMPOSER_BINARY" install --no-interaction --no-dev \
  --prefer-dist --optimize-autoloader --no-progress
```

No seeder runs. `DatabaseSeeder` deletes and recreates demo organization data,
so it is not production-safe. Config and route caches remain disabled because
shared-hosting CLI and web PHP configurations can differ. The deployment clears
config, route, view, event, and compiled caches instead. Before migration it
also verifies that the server environment is production, debug mode is off, an
application key exists, and the documented sync/file queue, cache, and session
drivers are active.

## Synchronization and persistent data

Private synchronization uses `--delete-delay`, but excludes `.env*`, `vendor/`,
`node_modules/`, `public/`, all of `storage/`, `bootstrap/cache/*`, test files,
SQLite files, logs, Git/GitHub metadata, editor metadata, and the safety marker.
Consequently the production `.env`, runtime state, logs, sessions, and stored
files cannot be deleted by rsync. Composer owns `vendor/` on the server.

Public synchronization also uses `--delete-delay` so obsolete hashed frontend
assets are removed. It protects `.blockbug-public-root`, `.well-known/`,
`cgi-bin/`, `uploads/`, the `storage` symlink, and the server-managed `.user.ini`.
Bug attachments remain in `PUBLIC_PATH/uploads/bugs`; include that directory and
`APP_PATH/storage/` in server backups.

If this replaces a live installation of the retired standalone `backend/`, copy
its production `uploads/bugs` directory into `PUBLIC_PATH/uploads/bugs` before
the first workflow run. Treat the image files committed under the legacy
backend as samples, not as a production backup.

## Queue, scheduler, and operational limits

BlockBug defines no queued jobs and dispatches none. Production should use
`QUEUE_CONNECTION=sync`; no queue worker or `queue:restart` command is required.
It also defines no scheduled task, so no cPanel cron entry is required. If
scheduling is added later, configure this only after review:

```cron
* * * * * /absolute/php-binary /absolute/APP_PATH/artisan schedule:run >> /dev/null 2>&1
```

This is an in-place, non-atomic shared-hosting deployment with no automated
rollback. Maintenance mode covers Composer, cache clearing, and migrations on
subsequent deployments, but the two rsync operations happen before maintenance
mode begins. Back up the database and persistent upload/storage directories,
and retain a known-good Git ref for a manual code rollback. Database migrations
may require a separate forward-fix because Laravel migrations can be
irreversible; this project's current migration deliberately has a non-
destructive `down()` method.
