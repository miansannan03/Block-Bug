# Deployment Notes

## Backend on Render

Use the `backend/` directory as the Render service root. The backend already includes:

- `backend/Dockerfile` for container build
- `backend/render-start.sh` as the container start command
- PostgreSQL migrations in `backend/database/`

### Required Render environment variables

- `DATABASE_URL` - preferred on Render; use the Render Postgres internal connection string
- `DB_HOST` - optional fallback if you are not using `DATABASE_URL`
- `DB_PORT` - optional fallback, usually `5432`
- `DB_DATABASE` - optional fallback database name
- `DB_USERNAME` - optional fallback database user
- `DB_PASSWORD` - optional fallback database password
- `APP_URL` - optional; Render also provides `RENDER_EXTERNAL_URL` automatically
- `FRONTEND_URL` - the public Vercel frontend URL
- `BLOCKCHAIN_ENABLED` - set `true` if you want blockchain syncing enabled
- `BLOCKCHAIN_AUDIT_SERVICE_URL` - backend service URL if blockchain syncing is used
- `BLOCKCHAIN_NODE_BINARY` - usually `node`

The repo now includes a root `render.yaml` Blueprint for a Docker-based backend service plus a Render Postgres database.

## Frontend on Vercel

Set this environment variable in Vercel:

- `NEXT_PUBLIC_API_URL` - the public Render backend URL

Then redeploy the frontend so the client uses the new API base URL.

## Local Development

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://localhost:3000` or `http://localhost:5173`

The root `.env.local` currently points the frontend at the local backend for development.
