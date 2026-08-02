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


resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-igw"
  })
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_primary
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-1"
    Tier = "public"
  })
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_secondary
  availability_zone       = data.aws_availability_zones.available.names[2]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-2"
    Tier = "public"
  })
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_az1
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-a"
    Tier = "private"
  })
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_az2
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-b"
    Tier = "private"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public"
  })
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-public"
  subnet_ids = [aws_subnet.public.id, aws_subnet.public_b.id]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnets"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "ec2" {
  name        = "${local.name_prefix}-ec2"
  description = "Public access to SynthAPI API host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ec2"
  })
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

  ingress {
    description = "PostgreSQL public access"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # WARNING: Consider restricting to your specific IP for security
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
  publicly_accessible      = true
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
