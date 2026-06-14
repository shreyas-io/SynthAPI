# SynthAPI

Docker-first local stack with:

- `gateway/`: Nginx gateway configuration.
- `web-apps/apps/api`: Express API, reachable through Nginx in local Docker.
- `web-apps/apps/web`: React/Vite frontend.
- `web-apps/packages/application`: backend application package consumed by the API.

## Quick Start

```bash
docker compose up --build
```

The backend API port is internal-only. Use Nginx for backend traffic.

Local defaults:

- App entry: `http://localhost:8787/platform/`
- API: `http://localhost:8787/api/...`
- Mock APIs: `http://<project-slug>.mock.localhost:8787/...`
- Web: `http://localhost:5173`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- Redis Commander: `http://localhost:8081`

## Gateway Routes

Control-plane APIs go through Nginx:

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/api/v1/projects
```

Public mock APIs use the project slug subdomain locally. Nginx extracts the slug
from the host and forwards it to the backend as `x-project-slug`.

```bash
curl http://acme.mock.localhost:8787/users/123?fetch_account=true
```

The backend service itself does not know how slugs map to domains.

## Environment

Copy the root env example if you want to override Docker defaults:

```bash
cp .env.example .env
```

The frontend should use Nginx as its backend base URL:

```bash
VITE_API_BASE_URL=http://localhost:8787
```

The API uses `MOCK_API_BASE_URL_TEMPLATE=http://{projectSlug}.mock.localhost:8787`
to generate local mock URLs and curl examples from the backend.

## Workspace Commands

Run Node workspace commands from `web-apps/`:

```bash
cd web-apps
pnpm install
pnpm typecheck
pnpm build
```

Docker Compose runs migrations and starts API/frontend watchers automatically.

## Cloudflare Pages

The frontend deploys to Cloudflare Pages by direct upload with Wrangler.

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required GitHub repository variables:

- `CLOUDFLARE_PAGES_PROJECT_NAME`
- `VITE_API_BASE_URL`

`VITE_API_BASE_URL` should point at the deployed API host, for example
`https://api.<domain>`.

The workflow is [deploy-web.yml](/home/shreyas/Projects/mock-stack/.github/workflows/deploy-web.yml) and publishes the built `dist/` directory to the configured Pages project.

## AWS Backend

Terraform lives in [terraform/](/home/shreyas/Projects/mock-stack/terraform). The production backend stack is split into:

- [terraform/bootstrap/README.md](/home/shreyas/Projects/mock-stack/terraform/bootstrap/README.md) for the remote-state backend and GitHub IAM roles
- [terraform/envs/prod/README.md](/home/shreyas/Projects/mock-stack/terraform/envs/prod/README.md) for the EC2/RDS/ECR/Route53 stack

The API deploy workflow is [deploy-api.yml](/home/shreyas/Projects/mock-stack/.github/workflows/deploy-api.yml). It assumes the bootstrap-created deploy role, builds `linux/arm64`, pushes to ECR, and restarts the single `synthapi-api` systemd service over SSM.

Required GitHub repository variables:

- `AWS_REGION`
- `AWS_TERRAFORM_ROLE_ARN`
- `AWS_API_DEPLOY_ROLE_ARN`
- `TF_STATE_BUCKET`
- `TF_STATE_LOCK_TABLE`
- `DOMAIN_NAME`
- `PLATFORM_PAGES_CNAME_TARGET`
- `ACME_EMAIL`
- `BOOTSTRAP_SECRET_ARN`
- `API_ECR_REPOSITORY`
- `API_INSTANCE_SERVICE_TAG`
- `API_BASE_URL`

Required GitHub repository secret:

- `TF_VAR_DB_PASSWORD`

The EC2 instance reads one AWS Secrets Manager JSON secret whose body must contain:

```json
{
  "USE_VAULT_SECRETS": "true",
  "INFISICAL_SITE_URL": "https://app.infisical.com",
  "INFISICAL_ENVIRONMENT": "prod",
  "INFISICAL_PROJECT_ID": "...",
  "INFISICAL_SECRET_PATH": "/synthapi/prod",
  "INFISICAL_CLIENT_ID": "...",
  "INFISICAL_CLIENT_SECRET": "..."
}
```

Everything else stays in Infisical, including `DB_*`, `REDIS_*`, OAuth config, MailerSend config, and the public app URL settings.
