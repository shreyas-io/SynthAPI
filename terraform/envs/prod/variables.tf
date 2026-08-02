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

variable "DB_INSTANCE_CLASS" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
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

variable "DB_ALLOWED_CIDR_BLOCKS" {
  description = "CIDR blocks allowed to connect to RDS PostgreSQL. Restrict this to Cloudflare IP ranges in production."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "DB_ENGINE_VERSION" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "17"
}

variable "DB_ALLOCATED_STORAGE" {
  description = "Initial RDS storage size in GiB."
  type        = number
  default     = 20
}

variable "DB_MAX_ALLOCATED_STORAGE" {
  description = "Maximum RDS storage size in GiB for autoscaling."
  type        = number
  default     = 100
}

variable "DB_PUBLICLY_ACCESSIBLE" {
  description = "Whether the RDS instance is publicly accessible."
  type        = bool
  default     = true
}

variable "DB_BACKUP_RETENTION_PERIOD" {
  description = "Number of days to retain automated RDS backups."
  type        = number
  default     = 7
}

variable "LAMBDA_MEMORY_SIZE" {
  description = "Python runner Lambda memory size in MB."
  type        = number
  default     = 512
}

variable "LAMBDA_TIMEOUT" {
  description = "Python runner Lambda timeout in seconds."
  type        = number
  default     = 30
}
