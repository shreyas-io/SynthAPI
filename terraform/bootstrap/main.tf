data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  github_subject = "repo:${var.GITHUB_REPOSITORY}:ref:refs/heads/${var.GITHUB_BRANCH}"
  common_tags = {
    Project     = "synthapi"
    Environment = "bootstrap"
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = var.TF_STATE_BUCKET

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
  ]

  tags = local.common_tags
}

data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    effect = "Allow"

    actions = [
      "sts:AssumeRoleWithWebIdentity",
    ]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_subject]
    }
  }
}

resource "aws_iam_role" "terraform" {
  name               = var.TERRAFORM_ROLE_NAME
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "terraform_admin" {
  role       = aws_iam_role.terraform.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role" "api_deploy" {
  name               = var.API_DEPLOY_ROLE_NAME
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json

  tags = local.common_tags
}

data "aws_iam_policy_document" "api_deploy" {
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
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]

    resources = [
      "arn:${data.aws_partition.current.partition}:ecr:${var.AWS_REGION}:${data.aws_caller_identity.current.account_id}:repository/${var.ECR_REPOSITORY_NAME}",
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "ec2:DescribeInstances",
      "ssm:GetCommandInvocation",
      "ssm:ListCommandInvocations",
      "ssm:SendCommand",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "api_deploy" {
  name   = "${var.API_DEPLOY_ROLE_NAME}-policy"
  role   = aws_iam_role.api_deploy.id
  policy = data.aws_iam_policy_document.api_deploy.json
}
