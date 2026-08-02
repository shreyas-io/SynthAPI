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

variable "TERRAFORM_ROLE_NAME" {
  description = "IAM role name used by GitHub Actions for Terraform."
  type        = string
  default     = "synthapi-terraform"
}

variable "LOCAL_POWER_USER_NAME" {
  description = "IAM user name for local developer PowerUser access."
  type        = string
  default     = "shreyas"
}
