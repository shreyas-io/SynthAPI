# Mock Stack — AWS Deployment Plan

## Architecture

```
Cloudflare Pages (UI)
       │
       ▼  HTTPS (:443)
┌─────────────────────────────────────┐
│  EC2 t4g.micro (public subnet)      │  Free tier year 1
│                                     │
│  Nginx (:80 / :443)                 │
│    ├─ rate limiting (limit_req)     │
│    ├─ /mock-stack/*  → API:3001     │  Control plane
│    └─ *.domain.com    → API:3001    │  Public mock APIs (x-project-slug)
│                                     │
│  API Server (:3001, 127.0.0.1)      │  Express on Node 22
│  Redis (:6379, 127.0.0.1)           │  redis:7-alpine in Docker
│                                     │
└──────────────┬──────────────────────┘
               │ VPC private IP
               ▼ TCP 5432
┌──────────────────────────────────────┐
│  RDS db.t4g.micro (private subnet)   │  Free tier year 1
│  PostgreSQL 17                       │
│  20GB gp3 storage                    │
│  Automated backups (7-day retention) │
└──────────────────────────────────────┘
```

## Cost Breakdown (us-east-1)

| Resource | Year 1 | Year 2+ |
|---|---|---|
| EC2 t4g.micro (750h free tier) | $0 | ~$8 |
| RDS db.t4g.micro (750h free tier) | $0 | ~$12 |
| Elastic IP | ~$4 | ~$4 |
| EBS 8GB gp3 root volume | ~$1 | ~$1 |
| Data transfer out (first 100GB free) | $0 | ~$0-5 |
| Cloudflare Pages (free tier) | $0 | $0 |
| **Total** | **~$5/mo** | **~$25-30/mo** |

No NAT Gateway (EC2 is public), no ElastiCache (Redis on localhost), no ALB (one EC2).

## Terraform Resources

### 1. `provider.tf`
- AWS provider, region variable (default `us-east-1`)

### 2. `network.tf`
- VPC: `10.0.0.0/16`
- 1 public subnet: `10.0.1.0/24` (EC2)
- 1 private subnet: `10.0.2.0/24` (RDS)
- Internet Gateway + route tables (public subnet gets default route via IGW)

### 3. `security-groups.tf`

| SG Name | Inbound Rules | Purpose |
|---|---|---|
| **ec2-sg** | TCP 80 from 0.0.0.0/0 | HTTP |
| | TCP 443 from 0.0.0.0/0 | HTTPS |
| | TCP 8787 from 0.0.0.0/0 | Alternate port (dev/debug) |
| | TCP 22 from 0.0.0.0/0 | SSH (optional, can restrict) |
| | All outbound | Egress |
| **rds-sg** | TCP 5432 from ec2-sg only | PostgreSQL |

### 4. `ec2.tf`
- AMI: Amazon Linux 2023 (AL2023) — `al2023-ami-2023.*-kernel-6.1-arm64` (Graviton)
- Instance type: `t4g.micro` (ARM/Graviton, slightly cheaper)
- Public subnet, auto-assign public IP
- Elastic IP attached
- IAM instance profile with SSM managed policy (shell access via Session Manager)
- User-data script (see below)

### 5. `rds.tf`
- `db.t4g.micro` (free tier eligible)
- PostgreSQL 17
- 20GB gp3 storage
- Single-AZ (no Multi-AZ — saves cost)
- Private subnet group (in the private subnet)
- Auto backups: 7-day retention
- Deletion protection: enabled
- Skip final snapshot for dev, enable for prod
- Master password in `variables.tf` (sourced from `.tfvars` or env var)

### 6. `iam.tf`
- IAM role for EC2: `AmazonSSMManagedInstanceCore` policy
- (Optional) ECR pull permissions for the API Docker image

### 7. `variables.tf`

| Variable | Default | Purpose |
|---|---|---|
| `region` | `us-east-1` | AWS region |
| `environment` | `production` | Tagging |
| `db_password` | (sensitive) | RDS master password |
| `api_port` | `3001` | API server port |
| `rate_limit_api` | `30` | Control plane req/s |
| `rate_limit_mock` | `100` | Public mock API req/s |
| `domain_name` | — | Your domain (for Nginx config) |
| `cf_pages_domain` | — | Cloudflare Pages domain (CORS) |

### 8. `outputs.tf`
- `ec2_public_ip` / `ec2_public_dns`
- `rds_endpoint`
- `ec2_sg_id`

## EC2 User-Data Script (Bootstrapping)

```bash
#!/bin/bash
set -euo pipefail

# === Install Docker ===
dnf install -y docker
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# === Run Redis ===
docker run -d \
  --name redis \
  --restart always \
  -p 127.0.0.1:6379:6379 \
  redis:7-alpine

# === Run API Server ===
# (Image pushed to ECR from CI/CD pipeline)
aws ecr get-login-password --region ${region} | \
  docker login --username AWS --password-stdin ${account_id}.dkr.ecr.${region}.amazonaws.com

docker run -d \
  --name api \
  --restart always \
  -p 127.0.0.1:3001:3001 \
  --env-file /opt/api/.env \
  ${account_id}.dkr.ecr.${region}.amazonaws.com/mock-stack-api:latest

# === Install & Configure Nginx ===
dnf install -y nginx

cat > /etc/nginx/conf.d/mock-stack.conf << 'NGINX'
limit_req_zone $binary_remote_addr zone=api:10m rate=${rate_limit_api}r/s;
limit_req_zone $binary_remote_addr zone=mock:10m rate=${rate_limit_mock}r/s;

# Control plane
server {
    listen 80;
    server_name api.${domain_name};

    location /mock-stack/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Public mock APIs (wildcard subdomain)
server {
    listen 80;
    server_name ~^(?<slug>[^.]+)\.${domain_name}$;

    location / {
        limit_req zone=mock burst=50 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Project-Slug $slug;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

rm -f /etc/nginx/conf.d/default.conf
systemctl enable nginx
systemctl start nginx

# === Write API .env ===
mkdir -p /opt/api
cat > /opt/api/.env << 'ENV'
PORT=${api_port}
HOST=127.0.0.1
CORS_WHITELISTED_DOMAINS=https://${cf_pages_domain}
DB_HOST=${rds_endpoint}
DB_PORT=5432
DB_USER=postgres
DB_PASS=${db_password}
DB_NAME=mock_api
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
ENV
```

## Files to Create

| File | Location | Purpose |
|---|---|---|
| `Dockerfile.prod` | `web-apps/apps/api/` | Multi-stage production build |
| `mock-stack.conf` | `gateway/nginx/` | Nginx config for the EC2 |
| `api.env.aws` | `web-apps/apps/api/` | Template `.env` for production |

## Production Dockerfile (`web-apps/apps/api/Dockerfile.prod`)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
COPY web-apps/package.json web-apps/pnpm-lock.yaml web-apps/pnpm-workspace.yaml ./
COPY web-apps/apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @mock-stack/api...
COPY web-apps/apps/api/ apps/api/
COPY web-apps/tsconfig.base.json ./
RUN pnpm --filter @mock-stack/api run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
COPY web-apps/package.json web-apps/pnpm-lock.yaml web-apps/pnpm-workspace.yaml ./
COPY web-apps/apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --prod --filter @mock-stack/api...
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/migrations apps/api/migrations
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
```

## CI/CD Workflow

```
Git push main
    │
    ├─ web-apps/apps/web/* changed → pnpm run deploy (Cloudflare Pages)
    │
    └─ web-apps/apps/api/* changed → docker build → push ECR
                                      → SSM SendCommand to EC2:
                                        docker pull && docker stop api && docker start api
```

## Open Items / Decisions Needed

1. **Domain name** — Need one for Nginx `server_name` and SSL (e.g., `mock-stack.dev`)
2. **SSL** — Cloudflare proxy (free SSL termination) or Let's Encrypt certbot on EC2?
3. **CI/CD** — GitHub Actions, GitLab CI, or other?
4. **ECR or Docker Hub** — Where to host the API Docker image?
5. **SSH key** — Optional; SSM Session Manager is recommended (no bastion host needed)
6. **Cloudflare Pages domain** — Needed for the `CORS_WHITELISTED_DOMAINS` env var
