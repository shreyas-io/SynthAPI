output "terraform_state_bucket_name" {
  description = "S3 bucket name for Terraform remote state."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "github_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN."
  value       = aws_iam_openid_connect_provider.github_actions.arn
}

output "terraform_role_arn" {
  description = "IAM role ARN for Terraform GitHub Actions runs."
  value       = aws_iam_role.terraform.arn
}

output "api_deploy_role_arn" {
  description = "IAM role ARN for API deployment GitHub Actions runs."
  value       = aws_iam_role.api_deploy.arn
}

output "local_power_user_name" {
  description = "IAM user name for local developer PowerUser access."
  value       = aws_iam_user.local_power_user.name
}

output "local_power_user_arn" {
  description = "IAM user ARN for local developer PowerUser access."
  value       = aws_iam_user.local_power_user.arn
}
