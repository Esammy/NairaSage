# Deploying NairaSage to Alibaba Cloud (ECS + OSS)

This is the runbook for the hackathon's "backend running on Alibaba Cloud"
requirement. Frontend stays on Vercel; the backend stack runs on one ECS
instance via docker compose.

## 0. Prerequisites (do this first — account friction is the #1 schedule risk)

- Alibaba Cloud account with the **hackathon coupon redeemed** so you have credit.
- A **DashScope / Model Studio API key** (`sk-...`) — see the README "coupon" notes.
- A domain you control for HTTPS (e.g. a subdomain like `api.nairasage.<yourdomain>`).

## 1. Create the OSS bucket (media storage = 2nd Alibaba service)

1. OSS console → Create Bucket in the **same region as your ECS instance**. The
   free-trial ECS regions are limited (Singapore, US Virginia, Tokyo, …), so pick
   one and match it here — e.g. US (Virginia) = `us-east-1`.
2. Create an AccessKey pair (RAM user with OSS permissions is best practice).
3. Note the **S3-compatible endpoint** — mind the `s3.` prefix:
   `https://s3.oss-us-east-1.aliyuncs.com`. OSS requires Signature V2 (boto3's
   default SigV4 fails); `production.py` sets `AWS_S3_SIGNATURE_VERSION=s3` for you.

## 2. Launch the ECS instance

- Image: Ubuntu 22.04 LTS. Size: 2 vCPU / 4 GB (e.g. `ecs.e-c1m2.large`) is enough for a demo.
- Security group inbound: TCP **22** (SSH), **80**, **443**.
- Assign a public IP. SSH in and install Docker + the compose plugin:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

## 3. Point a hostname at the instance

Caddy needs a real hostname (not a bare IP) to get a TLS cert, and the browser
needs HTTPS on the API. Two options:

- **Own a domain:** create an **A record** `api.nairasage.<yourdomain>` → ECS IP.
- **No domain (free):** use [DuckDNS](https://www.duckdns.org) — sign in, add a
  sub-domain (e.g. `nairasage`), and set its IP to the ECS public IP. You get
  `nairasage.duckdns.org`. It's on the Public Suffix List, so Let's Encrypt rate
  limits are per-subdomain (unlike sslip.io/nip.io, whose shared limit is often
  exhausted). Caddy also falls back to ZeroSSL automatically.

Whichever you pick, that hostname becomes `CADDY_DOMAIN`, `ALLOWED_HOSTS`, and
(with an `/api` suffix) the frontend's `NEXT_PUBLIC_API_URL`.

## 4. Configure and launch

```bash
git clone <your-public-repo-url> nairasage && cd nairasage
cp backend/.env.production.example backend/.env
nano backend/.env      # fill every <...> — see that file's comments
```

The default path reuses your existing (Supabase) `DATABASE_URL`, so the RAG
corpus is already in place — **no ingest step needed**. Bring the stack up:

```bash
export CADDY_DOMAIN=api.nairasage.<yourdomain>   # compose reads this for TLS
docker compose up -d --build
docker compose exec web python manage.py migrate            # no-op if already migrated
docker compose exec web python manage.py collectstatic --noinput
docker compose exec web python manage.py createsuperuser    # optional (admin)
```

That's it — web + worker + redis + Caddy are running against your Supabase DB.

## 5. Verify

```bash
# Alibaba integration proof (DashScope chat + embeddings + OSS round-trip):
docker compose exec web python -m integrations.alibaba_cloud

# API is up and TLS works (expect {"status":"ok"}):
curl https://api.nairasage.<yourdomain>/api/health/live/

# SSE streams through Caddy without buffering (watch event: lines arrive live):
curl -N -X POST https://api.nairasage.<yourdomain>/api/agent/chat/stream/ \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"message":"How do I turn savings into a cashflow asset?"}'
```

Then set `NEXT_PUBLIC_API_URL=https://api.nairasage.<yourdomain>` in Vercel and
redeploy the frontend. Run an end-to-end chat — the orchestration panel should
show specialists working in parallel, and a statement-photo upload should land
in your OSS bucket.

### Optional: fully self-contained DB on ECS (no Supabase)

For an "everything on Alibaba" story, run the co-located pgvector Postgres and
load a dump of your Supabase data:

```bash
# In backend/.env set: DATABASE_URL=postgres://nairasage:nairasage@db:5432/nairasage
docker compose --profile localdb up -d --build
# migrate schema, then copy the corpus + data from Supabase:
docker compose exec web python manage.py migrate
pg_dump "<your-supabase-url>" --no-owner --no-privileges --data-only \
  | docker compose exec -T db psql -U nairasage nairasage
```

## 6. Capture submission proof

- Screen-record the deploy proof: terminal output of `python -m integrations.alibaba_cloud`
  plus the OSS console showing an uploaded scan object.
- The "code file demonstrating Alibaba Cloud services" the rules ask for is
  [`backend/integrations/alibaba_cloud.py`](../backend/integrations/alibaba_cloud.py).

## Notes / scope cuts

- No managed RDS/Redis, no CI/CD to ECS, no Terraform — deliberate. To redeploy:
  `git pull && docker compose up -d --build`.
- pgvector image (`pgvector/pgvector:pg16`) is required; plain `postgres` fails
  the `CREATE EXTENSION vector` migration.
