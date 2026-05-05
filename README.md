# mock-stack

Docker-first local stack with:

- `gateway/`: Kong Gateway DB-less configuration.
- `web-apps/apps/api`: Express API, reachable through Kong in local Docker.
- `web-apps/apps/web`: React/Vite frontend.
- `web-apps/packages/application`: backend application package consumed by the API.

## Quick Start

```bash
docker compose up --build
```

The backend API port is internal-only. Use Kong for backend traffic.

Local defaults:

- Kong gateway: `http://localhost:8787`
- Web: `http://localhost:5173`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- Redis Commander: `http://localhost:8081`

## Gateway Routes

Control-plane APIs go through Kong:

```bash
curl http://localhost:8787/mock-stack/health
curl http://localhost:8787/mock-stack/api/v1/projects
```

Public mock APIs use project subdomains. Kong extracts the slug from the host
and forwards it to the backend as `x-project-slug`.

```bash
curl -H "Host: acme.mock-stack.localhost" \
  "http://localhost:8787/users/123?fetch_account=true"
```

The backend service itself does not know how slugs map to domains.

## Environment

Copy the root env example if you want to override Docker defaults:

```bash
cp .env.example .env
```

The frontend should use Kong as its backend base URL:

```bash
VITE_API_BASE_URL=http://localhost:8787/mock-stack
```

## Workspace Commands

Run Node workspace commands from `web-apps/`:

```bash
cd web-apps
pnpm install
pnpm typecheck
pnpm build
```

Docker Compose runs migrations and starts API/frontend watchers automatically.
