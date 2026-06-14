variable "AWS_REGION" {
  description = "AWS region for bootstrap resources."
  type        = string
  default     = "us-east-1"
}

variable "GITHUB_REPOSITORY" {
  description = "GitHub repository in owner/repo format."
  type        = string
}

variable "GITHUB_BRANCH" {
  description = "GitHub branch allowed to assume the deployment roles."
  type        = string
  default     = "main"
}

variable "TF_STATE_BUCKET" {
  description = "S3 bucket name for Terraform remote state."
  type        = string
}

variable "TF_STATE_LOCK_TABLE" {
  description = "DynamoDB table name for Terraform state locking."
  type        = string
  default     = "synthapi-terraform-locks"
}

variable "TERRAFORM_ROLE_NAME" {
  description = "IAM role name used by GitHub Actions for Terraform."
  type        = string
  default     = "synthapi-terraform"
}

variable "API_DEPLOY_ROLE_NAME" {
  description = "IAM role name used by GitHub Actions for API deploys."
  type        = string
  default     = "synthapi-api-deploy"
}

variable "ECR_REPOSITORY_NAME" {
  description = "Name of the API ECR repository used by the deploy role."
  type        = string
  default     = "synthapi-api"
}
