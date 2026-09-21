# BlockBug

BlockBug is a bug tracking UI built with React 19, Vite, TypeScript, Laravel 12, and MySQL.

## Run locally

1. Start MySQL in Laragon.
2. Run `npm run dev:api` in one terminal.
3. Run `npm run dev` in another terminal.
4. Open `http://localhost:5173`.

The Laravel API uses the existing `blockbug` database configured in `laravel-api/.env`. Run `npm run build` to produce the frontend in `dist/`.

## Platform administration

BlockBug uses one email/password login at `/login`. Customer users are routed to their organization workspace, while platform Super Admins are routed to `/super-admin`. Super Admin accounts are deliberately stored outside customer organizations.

After migrating, provision the first platform account interactively:

```powershell
cd laravel-api
php artisan blockbug:create-super-admin owner@example.com --name="Platform Owner"
```

Organizations and users are onboarded through expiring, single-use links. The generated token is shown once; only its SHA-256 hash is stored in the database. Public organization signup and the legacy two-step organization login are disabled.

All organization APIs derive tenant identity and role from the bearer session. `X-Organization-Id`, `actorRole`, and other client-supplied authorization hints are not trusted by the Laravel API.

## Legacy blockchain folder

The `blockchain/` directory is retained as requested, but its executable source is commented and its npm scripts are disabled. Laravel does not connect to a chain, wallet, node, contract, or audit service. The frontend's blockchain product wording and historical proof display remain visible.
