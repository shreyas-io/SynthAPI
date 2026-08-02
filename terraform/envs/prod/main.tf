locals {
  name_prefix = "${var.PROJECT_NAME}-${var.ENVIRONMENT}"
}

# ---------------------------------------------------------------------------
# RDS PostgreSQL
# ---------------------------------------------------------------------------

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db"
  subnet_ids = slice(data.aws_subnets.default.ids, 0, min(2, length(data.aws_subnets.default.ids)))

  tags = {
    Name        = "${local.name_prefix}-db"
    Project     = var.PROJECT_NAME
    Environment = var.ENVIRONMENT
    ManagedBy   = "terraform"
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds"
  description = "PostgreSQL access to ${local.name_prefix} database"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.DB_ALLOWED_CIDR_BLOCKS
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${local.name_prefix}-rds"
    Project     = var.PROJECT_NAME
    Environment = var.ENVIRONMENT
    ManagedBy   = "terraform"
  }
}

resource "aws_db_instance" "postgres" {
  identifier               = "${local.name_prefix}-postgres"
  engine                   = "postgres"
  engine_version           = var.DB_ENGINE_VERSION
  instance_class           = var.DB_INSTANCE_CLASS
  allocated_storage        = var.DB_ALLOCATED_STORAGE
  max_allocated_storage    = var.DB_MAX_ALLOCATED_STORAGE
  storage_type             = "gp3"
  db_name                  = var.DB_NAME
  username                 = var.DB_USERNAME
  password                 = var.DB_PASSWORD
  db_subnet_group_name     = aws_db_subnet_group.main.name
  vpc_security_group_ids   = [aws_security_group.rds.id]
  publicly_accessible      = var.DB_PUBLICLY_ACCESSIBLE
  backup_retention_period  = var.DB_BACKUP_RETENTION_PERIOD
  delete_automated_backups = true
  deletion_protection      = false
  skip_final_snapshot      = true
  apply_immediately        = true

  tags = {
    Name        = "${local.name_prefix}-postgres"
    Project     = var.PROJECT_NAME
    Environment = var.ENVIRONMENT
    ManagedBy   = "terraform"
  }
}

# ---------------------------------------------------------------------------
# Python runner Lambda
# ---------------------------------------------------------------------------

module "lambda_python_runner" {
  source = "../../../infra/terraform/lambda-python-runner"

  function_name = "${local.name_prefix}-python-runner"
  memory_size   = var.LAMBDA_MEMORY_SIZE
  timeout       = var.LAMBDA_TIMEOUT
  aws_region    = var.AWS_REGION
}
