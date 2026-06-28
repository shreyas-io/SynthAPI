variable "AWS_REGION" {
  description = "AWS region for the production stack."
  type        = string
  default     = "us-east-1"
}

variable "ENVIRONMENT" {
  description = "Environment name used in tags and resource names."
  type        = string
  default     = "prod"
}

variable "PROJECT_NAME" {
  description = "Short project identifier used in names and tags."
  type        = string
  default     = "synthapi"
}

variable "DOMAIN_NAME" {
  description = "Primary public domain, for example synthapi.com."
  type        = string
}

variable "INSTANCE_TYPE" {
  description = "EC2 instance type for the API host."
  type        = string
  default     = "t4g.micro"
}

variable "DB_INSTANCE_CLASS" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "VALKEY_NODE_TYPE" {
  description = "ElastiCache Valkey node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "DB_NAME" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "mock_api"
}

variable "DB_USERNAME" {
  description = "Initial PostgreSQL master username."
  type        = string
  default     = "synthapi"
}

variable "DB_PASSWORD" {
  description = "Initial PostgreSQL master password."
  type        = string
  sensitive   = true
}

variable "ECR_REPOSITORY_NAME" {
  description = "ECR repository name for the API image."
  type        = string
  default     = "synthapi-api"
}

variable "API_IMAGE_TAG" {
  description = "Container image tag to boot on new instances."
  type        = string
  default     = "test-latest"
}

variable "BOOTSTRAP_SECRET_ARN" {
  description = "ARN of the AWS Secrets Manager JSON secret containing USE_VAULT_SECRETS, INFISICAL_*, and CLOUDFLARE_API_TOKEN."
  type        = string
}

variable "BOOTSTRAP_SECRET_VERSION_STAGE" {
  description = "Secrets Manager version stage to read for the bootstrap secret."
  type        = string
  default     = "AWSCURRENT"
}
