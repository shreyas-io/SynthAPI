# Terraform Bootstrap

Apply this root once to create the shared Terraform backend and GitHub Actions IAM roles.

## Required Inputs

- `GITHUB_REPOSITORY`
- `TF_STATE_BUCKET`

Optional overrides:

- `GITHUB_BRANCH`
- `TERRAFORM_ROLE_NAME`
- `API_DEPLOY_ROLE_NAME`
- `ECR_REPOSITORY_NAME`

## Apply

```bash
terraform -chdir=terraform/bootstrap init
terraform -chdir=terraform/bootstrap apply
```

Use the outputs to configure:

- the S3 backend for `terraform/envs/prod`
- `AWS_TERRAFORM_ROLE_ARN` in GitHub
- `AWS_API_DEPLOY_ROLE_ARN` in GitHub
