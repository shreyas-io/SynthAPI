# Terraform Prod

This root creates the live AWS backend stack for SynthAPI.

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
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD`
  - `WEB_APP_BASE_URL`
  - `MOCK_API_BASE_URL_TEMPLATE`
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - `CORS_WHITELISTED_DOMAINS`
  - `COOKIE_SECURE`
  - MailerSend and AI-provider values

Terraform outputs `rds_endpoint`; copy that into Infisical as `DB_HOST` after the first apply.
Set `REDIS_HOST=127.0.0.1` and `REDIS_PORT=6379` in Infisical for the single-host runtime.

## Backend Init

Configure the S3 backend created by `terraform/bootstrap`:

```bash
terraform -chdir=terraform/envs/prod init \
  -backend-config="bucket=<state bucket>" \
  -backend-config="key=prod/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=<lock table>"
```

## Apply

```bash
terraform -chdir=terraform/envs/prod plan
terraform -chdir=terraform/envs/prod apply
```
