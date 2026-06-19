output "api_url" {
  description = "Public API base URL."
  value       = "https://${local.api_domain}"
}

output "api_public_ip" {
  description = "Elastic IP to use for Cloudflare A records."
  value       = aws_eip.api.public_ip
}

output "mock_base_url_template" {
  description = "Public mock API URL template."
  value       = "https://{projectSlug}.${local.mock_domain}"
}

output "ecr_repository_url" {
  description = "ECR repository URL for the API image."
  value       = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  description = "RDS endpoint to store in Infisical as DB_HOST."
  value       = aws_db_instance.postgres.address
}

output "bootstrap_secret_arn" {
  description = "Secrets Manager secret ARN consumed by the EC2 bootstrap."
  value       = var.BOOTSTRAP_SECRET_ARN
}

output "autoscaling_group_name" {
  description = "Auto Scaling Group name for the API host."
  value       = aws_autoscaling_group.api.name
}
