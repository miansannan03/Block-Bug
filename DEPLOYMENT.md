# Local Development

BlockBug now runs as two ordinary applications:

- Vite + React frontend at `http://localhost:5173`
- Laravel API at `http://127.0.0.1:8000/api`
- Laragon MySQL database named `blockbug`

Start Laragon's MySQL service first. Then use two terminals from the repository root:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

For a fresh database, run:

```powershell
C:\laragon\bin\php\php-8.2.21-nts-Win32-vs16-x64\php.exe laravel-api\artisan migrate --seed
```

Configuration lives in `.env.local` for the frontend and `laravel-api/.env` for Laravel. The former custom PHP backend and blockchain workspace are retained only as commented legacy reference code and are not part of the runtime.
