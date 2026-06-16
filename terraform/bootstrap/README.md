# Terraform Bootstrap

Apply this root once to create the prod Terraform backend and GitHub Actions IAM roles.

Bootstrap state should use a manually-created S3 bucket that is not managed by this Terraform root.

## Required Inputs

- `GITHUB_REPOSITORY`
- `TF_STATE_BUCKET`

GitHub Actions also requires this repository variable:

- `BOOTSTRAP_STATE_BUCKET`: manually-created S3 bucket for `terraform/bootstrap` state

Optional overrides:

- `GITHUB_BRANCH`
- `TERRAFORM_ROLE_NAME`
- `API_DEPLOY_ROLE_NAME`
- `ECR_REPOSITORY_NAME`

## Apply

```bash
terraform -chdir=terraform/bootstrap init \
  -backend-config="bucket=<manual-bootstrap-state-bucket>" \
  -backend-config="key=bootstrap/terraform.tfstate" \
  -backend-config="region=us-east-1"
terraform -chdir=terraform/bootstrap apply
```

Use the outputs to configure:

- `TF_STATE_BUCKET` in GitHub, using the prod state bucket managed by this stack
- `AWS_TERRAFORM_ROLE_ARN` in GitHub
- `AWS_API_DEPLOY_ROLE_ARN` in GitHub

## Destroy

Destroy prod before destroying bootstrap. Bootstrap owns the Terraform state bucket and GitHub IAM roles, so deleting it first can strand prod resources.

```bash
terraform -chdir=terraform/envs/prod destroy
```

Then destroy bootstrap from the same manually-created bootstrap state bucket:

```bash
terraform -chdir=terraform/bootstrap destroy
```

The prod state bucket uses `force_destroy = true`, so bootstrap destroy also deletes any remaining state objects and old object versions in that bucket.
