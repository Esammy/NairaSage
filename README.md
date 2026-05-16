# NairaSage (Financial_expert)

Monorepo: Django REST API (`backend/`) and Next.js app (`frontend/`).

## Quick start (development)

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # edit values; see Environment below
python manage.py migrate
python manage.py runserver
```

`manage.py` uses `config.settings.development` by default.

### Redis

Cache, health checks, and RQ workers expect Redis at `REDIS_URL` (default `redis://127.0.0.1:6379/0`).

### RQ worker (routing-weight updates after chat feedback)

```bash
cd backend
python manage.py rqworker default high low
```

### Frontend

```bash
cd frontend
npm install
# optional: .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Deploying the frontend (Vercel / similar)

- Set the project **root directory** to **`frontend`** (not the monorepo root). If the root is wrong, only `/` may work and routes like `/login` or `/register` can return **404**.
- Set `NEXT_PUBLIC_API_URL` to your production API origin (HTTPS).
- Optional: `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` for analytics ([frontend/.env.example](frontend/.env.example)).
- Do not set `basePath` unless you intentionally serve the app under a subpath.
- After `npm run build`, `node scripts/check-next-routes.mjs` verifies critical routes exist in the build manifest (also run in CI).
- Next.js does not allow duplicate `app/login` and `app/(auth)/login` (same URL). Auth routes live only under `app/(auth)/…`.
- **Dashboard gate (MVP):** `frontend/middleware.ts` allows `/dashboard/*` only when the **`ns_session=1`** cookie is present. The client sets this cookie when tokens are stored and clears it on sign-out (`frontend/lib/auth.ts`). This is an interim layer until httpOnly cookie auth; JWT in `localStorage` alone is not visible to middleware.
- **shadcn/ui forms:** Not required for a minimal build; migrate goals/debt/tax screens to shared shadcn form primitives when you add the component library to the project.

## Environment matrix

| Variable | Required (prod) | Notes |
|----------|-----------------|--------|
| `SECRET_KEY` | Yes when `DEBUG=False` | No default in production |
| `DEBUG` | Set `False` | |
| `ALLOWED_HOSTS` | Yes | Comma-separated or JSON list via django-environ |
| `DATABASE_URL` | Yes | Postgres URL; omit only for local SQLite |
| `REDIS_URL` | Yes | e.g. `redis://host:6379/0` |
| `CORS_ALLOWED_ORIGINS` | Yes | Frontend origins, e.g. `https://app.example.com` |
| `CSRF_TRUSTED_ORIGINS` | If cookies/admin cross-origin | Often same as CORS origins |
| `FRONTEND_URL` | For email links | Password reset, email verification |
| `PAYSTACK_SECRET_KEY` | Billing | Webhook signature + server API |
| `PAYSTACK_PUBLIC_KEY` | Billing UI | Exposed to frontend via API if needed |
| `PAYSTACK_PLAN_STARTER`, `PAYSTACK_PLAN_PRO` | Subscriptions | Paystack plan codes |
| `MISTRAL_API_KEY` / `OPENAI_API_KEY` / `GROQ_API_KEY` | One per `LLM_PROVIDER` | See `backend/core/llm_factory.py` |
| `LLM_PROVIDER` | | `mistral` (default), `openai`, or `groq` |
| `SENTRY_DSN` | Optional | Set in production settings |
| `EMAIL_*` | Production mail | `EMAIL_BACKEND`, SMTP host/user/password |
| `AWS_*` | Optional | S3/R2 media when configured in production |
| `ASSEMBLYAI_API_KEY` | Optional | Real-time voice STT; tokens minted at `GET /api/wealth/voice/token/` (never expose the key in the browser) |

Copy [backend/.env.example](backend/.env.example) and extend with any keys above.

## Production deployment

- Set `DJANGO_SETTINGS_MODULE=config.settings.production` for Gunicorn (see [backend/config/wsgi.py](backend/config/wsgi.py)).
- Run `python manage.py collectstatic` before serving static files.
- Run at least one RQ worker process alongside the web server.
- Use Postgres and a managed Redis instance.
- See [docker-compose.yml](docker-compose.yml) for a reference stack.

## Docker

```bash
docker compose up --build
```

Adjust `REDIS_URL` / `DATABASE_URL` in compose environment if using host Redis instead of the `redis` service.

## Testing & CI

- Backend: `cd backend && python manage.py test`
- CI: `.github/workflows/ci.yml`
