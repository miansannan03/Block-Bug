# BlockBug

BlockBug is a bug tracking UI built with React 19, Vite, TypeScript, Laravel 12, and MySQL.

## Run locally

1. Start MySQL in Laragon.
2. Run `npm run dev:api` in one terminal.
3. Run `npm run dev` in another terminal.
4. Open `http://localhost:5173`.

The Laravel API uses the existing `blockbug` database configured in `laravel-api/.env`. Run `npm run build` to produce the frontend in `dist/`.

## Legacy blockchain folder

The `blockchain/` directory is retained as requested, but its executable source is commented and its npm scripts are disabled. Laravel does not connect to a chain, wallet, node, contract, or audit service. The frontend's blockchain product wording and historical proof display remain visible.
