# Terraform Prod

This root creates the live AWS backend stack for SynthAPI.

`ACME_STAGING` defaults to `false`, so first-boot certificate issuance uses the production Let's Encrypt CA. Set it to `true` only when testing certificate issuance or avoiding production rate limits during setup.

## Secrets Ownership

- AWS Secrets Manager bootstrap secret JSON:
  - `USE_VAULT_SECRETS`
  - `INFISICAL_SITE_URL`
  - `INFISICAL_ENVIRONMENT`
  - `INFISICAL_PROJECT_ID`
  - `INFISICAL_SECRET_PATH`
  - `INFISICAL_CLIENT_ID`
  - `INFISICAL_CLIENT_SECRET`
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
