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
  bucket        = var.TF_STATE_BUCKET
  force_destroy = true

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

resource "aws_iam_user" "local_power_user" {
  name          = var.LOCAL_POWER_USER_NAME
  force_destroy = false

  tags = local.common_tags
}

resource "aws_iam_user_policy_attachment" "local_power_user" {
  user       = aws_iam_user.local_power_user.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/PowerUserAccess"
}

data "aws_iam_policy_document" "local_power_user_self_manage" {
  statement {
    effect = "Allow"

    actions = [
      "iam:ChangePassword",
      "iam:CreateAccessKey",
      "iam:DeleteAccessKey",
      "iam:GetAccessKeyLastUsed",
      "iam:GetUser",
      "iam:ListAccessKeys",
      "iam:UpdateAccessKey",
    ]

    resources = [aws_iam_user.local_power_user.arn]
  }
}

resource "aws_iam_user_policy" "local_power_user_self_manage" {
  name   = "${var.LOCAL_POWER_USER_NAME}-self-manage"
  user   = aws_iam_user.local_power_user.name
  policy = data.aws_iam_policy_document.local_power_user_self_manage.json
}
