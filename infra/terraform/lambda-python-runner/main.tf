terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

locals {
  lambda_dir = "${path.module}/${var.lambda_dir}"
  zip_path   = "${path.module}/${var.zip_path}"
}

resource "null_resource" "build_lambda" {
  triggers = {
    index_mjs    = filesha256("${local.lambda_dir}/index.mjs")
    package_json = filesha256("${local.lambda_dir}/package.json")
  }

  provisioner "local-exec" {
    working_dir = local.lambda_dir
    command     = "npm install && zip -r ${local.zip_path} index.mjs node_modules package.json"
  }
}

data "archive_file" "lambda" {
  depends_on  = [null_resource.build_lambda]
  type        = "zip"
  source_dir  = local.lambda_dir
  output_path = local.zip_path
}

resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 7
}

resource "aws_lambda_function" "python_runner" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = var.runtime
  memory_size   = var.memory_size
  timeout       = var.timeout

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.lambda]
}

# IAM user for the Cloudflare Worker to invoke the Python runner Lambda.
# Workers run outside AWS and cannot assume IAM roles, so they need a long-lived
# access key. Scope is limited to lambda:InvokeFunction on THIS function only,
# so a leaked key's blast radius is "invoke the Python runner" and nothing else.
# The access key is created manually in the AWS console (see terraform/envs/prod
# README) to keep secret material out of Terraform state.
resource "aws_iam_user" "worker_invoker" {
  name = "${var.function_name}-invoker"
  tags = {
    Project   = "synthapi"
    Component = "cloudflare-worker"
    ManagedBy = "terraform"
  }
}

resource "aws_iam_user_policy" "worker_invoke_lambda" {
  name = "${var.function_name}-invoke"
  user = aws_iam_user.worker_invoker.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = aws_lambda_function.python_runner.arn
      }
    ]
  })
}
