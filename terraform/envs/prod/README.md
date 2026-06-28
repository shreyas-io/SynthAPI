# Terraform Prod

This root creates the live AWS backend stack for SynthAPI.

DNS for `DOMAIN_NAME` is expected to be hosted in Cloudflare. The EC2 bootstrap requests a Cloudflare Origin CA certificate for `api.<domain>` and `*.<domain>`, installs it on the instance, and serves it from nginx. This only works when the public DNS records stay proxied through Cloudflare and the zone SSL/TLS mode is `Full (strict)`.

Create these Cloudflare DNS records manually:

- `api.<domain>`: proxied `A` record to the Terraform-created Elastic IP.
- `*.<domain>`: proxied `A` record to the same Elastic IP for public mock hosts like `<project-slug>-mock.<domain>`.
- `platform.<domain>`: `CNAME` record to the Cloudflare Pages target, if needed.

## Secrets Ownership

- AWS Secrets Manager bootstrap secret JSON:
  - `USE_VAULT_SECRETS`
  - `INFISICAL_SITE_URL`
  - `INFISICAL_ENVIRONMENT`
  - `INFISICAL_PROJECT_ID`
  - `INFISICAL_SECRET_PATH`
  - `INFISICAL_CLIENT_ID`
  - `INFISICAL_CLIENT_SECRET`
  - `CLOUDFLARE_API_TOKEN`

The Cloudflare token must be able to create Origin CA certificates for the account/zone that owns `DOMAIN_NAME`.

- Infisical app/runtime values:
  - `DB_USER`
  - `DB_PASS`
  - `DB_HOST`
  - `DB_PORT`
  - `DB_NAME`
  - `REDIS_URL`
  - `WEB_APP_BASE_URL`
  - `MOCK_API_BASE_URL_TEMPLATE`
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - `CORS_WHITELISTED_DOMAINS`
  - `COOKIE_SECURE`
  - MailerSend and AI-provider values

Terraform outputs `rds_endpoint`; copy that into Infisical as `DB_HOST` after the first apply.
Set `REDIS_URL` in Infisical from your Upstash Redis database details. Use the `rediss://...` URL for TLS.

## Backend Init

Configure the S3 backend created by `terraform/bootstrap`:

```bash
terraform -chdir=terraform/envs/prod init \
  -backend-config="bucket=<state bucket>" \
  -backend-config="key=prod/terraform.tfstate" \
  -backend-config="region=us-east-1"
```

## Apply

```bash
terraform -chdir=terraform/envs/prod plan
terraform -chdir=terraform/envs/prod apply
```
