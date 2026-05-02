# mock-stack

A `pnpm` workspace monorepo with:

- `apps/api`: a Cloudflare Worker API built with Hono.
- `apps/web`: a React SPA deployed on Cloudflare Workers with static assets and the Cloudflare Vite plugin.
- `packages/application`: a pure TypeScript backend package consumed through dependency injection by the API worker.

## Quick start

```bash
pnpm install
pnpm dev
```

Local defaults:

- API: `http://127.0.0.1:8787`
- Web: `http://127.0.0.1:5173`

Create `apps/web/.env.local` with:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

Optional API CORS override in `apps/api/.dev.vars`:

```bash
FRONTEND_ORIGIN=http://127.0.0.1:5173
```
