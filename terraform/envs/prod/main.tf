data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_ssm_parameter" "al2023_arm64_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

locals {
  name_prefix             = "${var.PROJECT_NAME}-${var.ENVIRONMENT}"
  api_domain              = "api.${var.DOMAIN_NAME}"
  ecr_registry            = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.AWS_REGION}.amazonaws.com"
  api_image               = "${aws_ecr_repository.api.repository_url}:${var.API_IMAGE_TAG}"
  public_subnet_primary   = "10.0.1.0/24"
  public_subnet_secondary = "10.0.4.0/24"
  private_subnet_az1      = "10.0.2.0/24"
  private_subnet_az2      = "10.0.3.0/24"
  common_tags = {
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
  name       = "${local.name_prefix}-db"
  subnet_ids = [aws_subnet.public.id, aws_subnet.public_b.id]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnets"
  })
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
  description = "PostgreSQL access from the SynthAPI EC2 instance and public"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
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

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds"
  })
}

resource "aws_security_group" "valkey" {
  name        = "${local.name_prefix}-valkey"
  description = "Valkey access from the SynthAPI EC2 instance"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Valkey from EC2"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-valkey"
  })
}

resource "aws_db_instance" "postgres" {
  identifier               = "${local.name_prefix}-postgres"
  engine                   = "postgres"
  engine_version           = "17"
  instance_class           = var.DB_INSTANCE_CLASS
  allocated_storage        = 20
  storage_type             = "gp3"
  db_name                  = var.DB_NAME
  username                 = var.DB_USERNAME
  password                 = var.DB_PASSWORD
  db_subnet_group_name     = aws_db_subnet_group.main.name
  vpc_security_group_ids   = [aws_security_group.rds.id]
  backup_retention_period  = 7
  delete_automated_backups = true
  deletion_protection      = false
  multi_az                 = false
  skip_final_snapshot      = true
  publicly_accessible      = true
  apply_immediately        = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres"
  })
}

resource "aws_elasticache_subnet_group" "valkey" {
  name       = "${local.name_prefix}-valkey"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-valkey"
  })
}

resource "aws_elasticache_replication_group" "valkey" {
  replication_group_id = "${local.name_prefix}-valkey"
  description          = "SynthAPI Valkey cache"
  engine               = "valkey"
  node_type            = var.VALKEY_NODE_TYPE
  port                 = 6379
  num_cache_clusters   = 1
  subnet_group_name    = aws_elasticache_subnet_group.valkey.name
  security_group_ids   = [aws_security_group.valkey.id]
  apply_immediately    = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-valkey"
  })
}

resource "aws_ecr_repository" "api" {
  name                 = var.ECR_REPOSITORY_NAME
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-api"
  })
}

resource "aws_eip" "api" {
  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-api"
  })
}

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${local.name_prefix}-ec2"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "ec2_runtime" {
  statement {
    effect = "Allow"

    actions = [
      "ecr:GetAuthorizationToken",
    ]

    resources = ["*"]
  }

  statement {
    effect = "Allow"

    actions = [
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]

    resources = [aws_ecr_repository.api.arn]
  }

  statement {
    effect = "Allow"

    actions = [
      "autoscaling:SetInstanceHealth",
    ]

    resources = ["*"]
  }

  statement {
    effect = "Allow"

    actions = [
      "ec2:AssociateAddress",
      "ec2:DescribeAddresses",
      "ec2:DescribeInstances",
    ]

    resources = ["*"]
  }

  statement {
    effect = "Allow"

    actions = [
      "secretsmanager:GetSecretValue",
    ]

    resources = [var.BOOTSTRAP_SECRET_ARN]
  }
}

resource "aws_iam_role_policy" "ec2_runtime" {
  name   = "${local.name_prefix}-runtime"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_runtime.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2"
  role = aws_iam_role.ec2.name
}

resource "aws_launch_template" "api" {
  name_prefix   = "${local.name_prefix}-api-"
  image_id      = data.aws_ssm_parameter.al2023_arm64_ami.value
  instance_type = var.INSTANCE_TYPE

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2.name
  }

  metadata_options {
    http_tokens = "required"
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.ec2.id]
  }

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 8
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"

    tags = merge(local.common_tags, {
      Name    = "${local.name_prefix}-api"
      Service = "${local.name_prefix}-api"
    })
  }

  tag_specifications {
    resource_type = "volume"

    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-api"
    })
  }

  user_data = base64encode(templatefile("${path.module}/templates/user-data.sh.tftpl", {
    region                 = var.AWS_REGION
    api_domain             = local.api_domain
    domain_name            = var.DOMAIN_NAME
    bootstrap_secret_arn   = var.BOOTSTRAP_SECRET_ARN
    bootstrap_secret_stage = var.BOOTSTRAP_SECRET_VERSION_STAGE
    ecr_registry           = local.ecr_registry
    api_image              = local.api_image
    eip_allocation_id      = aws_eip.api.allocation_id
    nginx_config = templatefile("${path.module}/templates/nginx.conf.tftpl", {
      api_domain  = local.api_domain
      domain_name = var.DOMAIN_NAME
    })
    api_service_unit = templatefile("${path.module}/templates/synthapi-api.service.tftpl", {
      api_image = local.api_image
    })
    cert_renew_service_unit = templatefile("${path.module}/templates/synthapi-cert-renew.service.tftpl", {})
    cert_renew_timer_unit   = templatefile("${path.module}/templates/synthapi-cert-renew.timer.tftpl", {})
  }))

  update_default_version = true

  tags = local.common_tags
}

resource "aws_autoscaling_group" "api" {
  name                = "${local.name_prefix}-api"
  min_size            = 1
  max_size            = 2
  desired_capacity    = 1
  health_check_type   = "EC2"
  vpc_zone_identifier = [aws_subnet.public.id, aws_subnet.public_b.id]

  launch_template {
    id      = aws_launch_template.api.id
    version = aws_launch_template.api.latest_version
  }

  instance_refresh {
    strategy = "Rolling"

    preferences {
      min_healthy_percentage = 100
      max_healthy_percentage = 200
      instance_warmup        = 300
      skip_matching          = true
    }
  }

  tag {
    key                 = "Name"
    value               = "${local.name_prefix}-api"
    propagate_at_launch = true
  }

  tag {
    key                 = "Service"
    value               = "${local.name_prefix}-api"
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = var.PROJECT_NAME
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.ENVIRONMENT
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "terraform"
    propagate_at_launch = true
  }
}
