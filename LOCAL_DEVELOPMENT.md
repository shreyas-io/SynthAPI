# Local Development Setup

This project uses Docker Compose for local development, running the full stack including Cloudflare Workers bindings (KV, Durable Objects, Hyperdrive) with PostgreSQL.

## Architecture Overview

The local stack runs 5 services:

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| **api** | wrangler dev | 8787 | Hono/Cloudflare Workers API with local Workers runtime |
| **web** | Vite | 5173 | React frontend |
| **landing** | Vite | 5174 | Landing page |
| **python-runner-lambda** | Lambda emulator | 9001 | Python code execution via Pyodide |
| **postgres** | PostgreSQL 17 | 5432 | Application database |

## Quick Start

```bash
# Start all services
docker compose up --build
```

This will:
1. Build Docker images for all services
2. Start postgres (runs healthcheck)
3. Start api service (runs migrations, starts wrangler dev)
4. Start python-runner-lambda
5. Start web and landing services

**Access the applications:**
- API: http://localhost:8787
- Web: http://localhost:5173
- Landing: http://localhost:5174

## How Cloudflare Bindings Work Locally

The API uses Cloudflare Workers bindings. In local development, `wrangler dev` automatically provides local implementations:

### KV (Key-Value Store)

**Binding name:** `KV`

**How it works locally:**
- `wrangler dev` provisions an in-memory KV namespace automatically
- No configuration needed - it just works
- Data persists until you restart wrangler dev

**Configuration:** `wrangler.jsonc` kv_namespaces section

**Usage in this project:**
- Stores mock API variable state
- Used for runtime configuration

**Local verification:**
```bash
curl http://localhost:8787/api/v1/projects
# If KV works, this returns JSON (even if empty array)
```

### Durable Objects (Rate Limiter)

**Binding name:** `RATE_LIMITER_DO`

**How it works locally:**
- `wrangler dev` provisions a local Durable Object namespace
- DO instances run in the local Workers runtime

**Configuration:** `wrangler.jsonc` durable_objects section

**Usage in this project:**
- Currently dormant - configured but not invoked at runtime
- Available for future rate limiting features

**Local verification:**
```bash
docker compose logs api | grep -i "durable\|rate.limiter"
# Should show DO binding initialization
```

### Hyperdrive (Database Connection Pooling)

**Binding name:** `HYPERDRIVE`

**How it works locally:**
- Falls back to `localConnectionString` from wrangler.jsonc
- In docker-compose, overridden via `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` env var
- Points to postgres container instead of Cloudflare-managed database

**Configuration:**
- `wrangler.jsonc` hyperdrive section defines localConnectionString
- `docker-compose.yml` api service sets env var override

**Usage in this project:**
- Provides connection pooling to PostgreSQL
- Used for all database queries

**Local verification:**
```bash
curl http://localhost:8787/health
# Returns: {"app":"ok","db":true}
# db:true confirms Hyperdrive/database connection works
```

### Queue (Request Logs)

**Binding name:** `REQUEST_LOGS_QUEUE`

**How it works locally:**
- `wrangler dev` provisions a local queue
- Consumer handler processes messages synchronously

**Configuration:** `wrangler.jsonc` queues section

**Usage in this project:**
- Currently dormant - consumer is wired but nothing produces to it
- Available for future request logging features

### D1 Database

**NOT USED** - This project uses PostgreSQL with Kysely instead of D1.

## Environment Configuration

Environment variables are organized by service:

### Root Level
**File:** `.env.example` (no `.env` needed)

Contains documentation that no root-level variables are required. App configuration lives in app-specific `.env` files.

### API Configuration
**File:** `web-apps/apps/api/.env`

Contains:
- Database credentials (DB_USER, DB_PASS, DB_HOST, DB_NAME)
- OAuth configuration (Google OAuth)
- API keys (OpenRouter, Exa, Portkey, etc.)
- Service URLs (WEB_APP_BASE_URL, MOCK_API_BASE_URL_TEMPLATE)
- Feature flags (ENV=local, COOKIE_SECURE=false)

To customize:
```bash
cp web-apps/apps/api/.env.example web-apps/apps/api/.env
# Edit with your values
```

### Web Configuration
**File:** `web-apps/apps/web/.env`

Contains:
- VITE_API_BASE_URL (default: http://localhost:8787)

To customize:
```bash
cp web-apps/apps/web/.env.example web-apps/apps/web/.env
# Edit with your values
```

## Verifying the Setup

### Quick Verification

```bash
# Run the verification script
bash scripts/verify-local-setup.sh
```

### Manual Verification

**1. Check all services are running:**
```bash
docker compose ps
# All services should show "Up" status
# postgres should show "healthy" status
```

**2. Test API health endpoint:**
```bash
curl http://localhost:8787/health
# Expected: {"app":"ok","db":true}
```

**3. Test database connection:**
```bash
psql "postgresql://user:password@localhost:5432/mock_api" -c "SELECT version();"
# Should return PostgreSQL version info
```

**4. Verify bindings in logs:**
```bash
docker compose logs api | grep -i "kv\|durable\|hyperdrive"
# Should show binding initialization messages
```

**5. Test frontends:**
```bash
curl -I http://localhost:5173  # Web
curl -I http://localhost:5174  # Landing
# Both should return HTTP 200
```

## Development Workflow

### Making Changes to the API

1. Edit files in `web-apps/apps/api/src/`
2. `wrangler dev` auto-reloads on changes
3. Check logs: `docker compose logs -f api`
4. Test at http://localhost:8787

**Example:**
```bash
# Edit a file
vim web-apps/apps/api/src/create_app.ts

# Watch logs for reload
docker compose logs -f api

# Test the change
curl http://localhost:8787/health
```

### Making Changes to the Frontend

1. Edit files in `web-apps/apps/web/src/`
2. Vite dev server auto-reloads on changes
3. Browser should auto-refresh (HMR enabled)
4. Test at http://localhost:5173

**Example:**
```bash
# Edit a component
vim web-apps/apps/web/src/App.tsx

# Browser auto-refreshes
# Check http://localhost:5173
```

### Running Database Migrations

Migrations run automatically on API startup. To run manually:

```bash
docker compose exec api pnpm --filter @synthapi/api run migrate:latest
```

To rollback:
```bash
docker compose exec api pnpm --filter @synthapi/api run migrate:down
```

### Viewing Logs

**All services:**
```bash
docker compose logs -f
```

**Specific service:**
```bash
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
```

## Common Issues and Troubleshooting

### Port Already in Use

**Problem:** Port 8787 (or another port) is already in use.

**Solution:**
```bash
# Edit docker-compose.yml
# Find the api service ports section
# Change "8787:8787" to "8788:8787"
# Then access API at http://localhost:8788
```

### Database Connection Errors

**Problem:** API can't connect to database.

**Troubleshooting:**
```bash
# 1. Check postgres container is healthy
docker compose ps postgres
# Should show "healthy" status

# 2. Verify postgres is accessible
docker compose exec postgres pg_isready -U user

# 3. Check DATABASE_URL in web-apps/apps/api/.env
# Should match docker-compose credentials:
# DB_USER=user
# DB_PASS=password
# DB_HOST=postgres
# DB_NAME=mock_api

# 4. Verify env var override is set
docker compose exec api env | grep HYPERDRIVE
# Should show: CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://user:password@postgres:5432/mock_api
```

### Migration Failures

**Problem:** Migrations fail to run.

**Troubleshooting:**
```bash
# 1. Check postgres is healthy
docker compose ps postgres

# 2. Re-run migrations manually
docker compose exec api pnpm --filter @synthapi/api run migrate:latest

# 3. Check migration files exist
ls web-apps/apps/api/src/infrastructure/kysely/migrations/

# 4. Check for database errors
docker compose logs api | grep -i "migration\|database\|error"
```

### Frontend Can't Reach API

**Problem:** Web app shows network errors trying to reach API.

**Troubleshooting:**
```bash
# 1. Check API is running
curl http://localhost:8787/health

# 2. Check web app's VITE_API_BASE_URL
docker compose exec web env | grep VITE_API_BASE_URL
# Should be: VITE_API_BASE_URL=http://localhost:8787

# 3. Check CORS configuration
# API CORS is configured in web-apps/apps/api/src/create_app.ts
# Should include http://localhost:5173 in CORS_WHITELISTED_DOMAINS

# 4. Check browser console for specific error
```

### Binding Not Available

**Problem:** Error about KV/DO/Hyperdrive binding not available.

**Troubleshooting:**
```bash
# 1. Check wrangler dev is running
docker compose logs api | grep -i "wrangler\|listening"

# 2. Verify binding exists in wrangler.jsonc
cat web-apps/apps/api/wrangler.jsonc | grep -A 5 "kv_namespaces\|hyperdrive\|durable_objects"

# 3. Check for binding initialization in logs
docker compose logs api | grep -i "kv\|durable\|hyperdrive"

# 4. Restart the api service
docker compose restart api
```

## Stopping Services

**Stop all services:**
```bash
docker compose down
```

**Stop and remove volumes (clears database):**
```bash
docker compose down -v
```

**Stop specific service:**
```bash
docker compose stop api
```

## Performance Notes

- **Startup time:** ~30-60 seconds for all services to be ready (postgres healthcheck + wrangler dev initialization)
- **Memory usage:** ~2-4 GB total (wrangler dev + 3 Vite servers + postgres)
- **CPU usage:** Low when idle, spikes during builds/rebuilds

## Deployment Notes

For production deployment, you'll need real Cloudflare binding IDs:

1. **KV Namespaces:**
   ```bash
   wrangler kv:namespace create "synthapi-api-kv"
   wrangler kv:namespace create "synthapi-api-kv" --preview
   # Replace <production-namespace-id> and <preview-namespace-id> in wrangler.jsonc
   ```

2. **Hyperdrive:**
   ```bash
   # Requires RDS endpoint from terraform/envs/prod output
   wrangler hyperdrive create synthapi-api-db \
     --origin-host=<rds-endpoint> \
     --origin-port=5432 \
     --origin-scheme=postgresql \
     --database=<db> \
     --origin-user=<user> \
     --origin-password=<password>;
   # Replace <hyperdrive-id> in wrangler.jsonc
   ```

3. **D1:** Not used - this project uses PostgreSQL instead.

See main README.md for full deployment instructions.

## Additional Resources

- **Cloudflare Workers docs:** https://developers.cloudflare.com/workers/
- **Wrangler docs:** https://developers.cloudflare.com/workers/wrangler/
- **Hono docs:** https://hono.dev/
- **Docker Compose docs:** https://docs.docker.com/compose/
