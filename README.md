# mock-stack

A `pnpm` workspace monorepo with:

- `apps/api`: an Express API intended for Docker/ECS on AWS.
- `apps/web`: a React SPA deployed on Cloudflare Workers/Pages with static assets and the Cloudflare Vite plugin.
- `packages/application`: a pure TypeScript backend package consumed through dependency injection by the API server.

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts Docker Compose for the app, Postgres, Redis, and Redis Commander. The app container runs both the API and frontend dev servers with hot reload.

Local defaults:

- API: `http://127.0.0.1:8787`
- Web: `http://127.0.0.1:5173`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- Redis Commander: `http://localhost:8081`

Create `apps/web/.env.local` with:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

Create `apps/api/.env` from `apps/api/.env.example` if you want to override local defaults:

```bash
CORS_WHITELISTED_DOMAINS=http://127.0.0.1:5173,http://localhost:5173
```

## Local Services

Start Postgres, Redis, and Redis Commander:

```bash
docker compose up -d
```

Local defaults:

- Postgres database: `mock_stack`
- Postgres user: `user`
- Postgres password: `password`
- Redis: `localhost:6379`
- Redis password: `redis-password`
- Redis Commander: `http://localhost:8081`

Stop the services:

```bash
docker compose down
```

## API Docker

Build the API container:

```bash
pnpm docker:api
```
