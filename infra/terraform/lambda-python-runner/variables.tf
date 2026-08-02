variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "synthapi-python-runner"
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs22.x"
}

variable "memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 512
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_dir" {
  description = "Path to the Lambda source directory relative to this module"
  type        = string
  default     = "../../../lambdas/python-runner"
}

variable "zip_path" {
  description = "Path to the generated Lambda zip file relative to this module"
  type        = string
  default     = "python-runner-lambda.zip"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
