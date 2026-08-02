• Run these once using root or an existing admin session.

Replace:

- YOUR_ACCOUNT_ID if you don’t want to auto-detect it
- YOUR_GITHUB_OWNER/YOUR_REPO later during Terraform bootstrap

1. Set shell variables

export AWS_REGION=us-east-1
export ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export USER_NAME="terraform-cli-user"
export ROLE_NAME="terraform-cli-role"

2. Create the IAM user

aws iam create-user --user-name "$USER_NAME"

3. Create the role trust policy

cat > /tmp/terraform-cli-role-trust.json <<EOF
{
"Version": "2012-10-17",
"Statement": [
{
"Effect": "Allow",
"Principal": {
"AWS": "arn:aws:iam::$ACCOUNT_ID:user/$USER_NAME"
},
"Action": "sts:AssumeRole"
}
]
}
EOF

4. Create the IAM role

aws iam create-role \
 --role-name "$ROLE_NAME" \
 --assume-role-policy-document file:///tmp/terraform-cli-role-trust.json

5. Attach admin access to the role

aws iam attach-role-policy \
 --role-name "$ROLE_NAME" \
 --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

6. Create the user policy that allows assuming the role

cat > /tmp/terraform-cli-user-assume-role.json <<EOF
{
"Version": "2012-10-17",
"Statement": [
{
"Effect": "Allow",
"Action": "sts:AssumeRole",
"Resource": "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
}
]
}
EOF

7. Attach that inline policy to the user

aws iam put-user-policy \
 --user-name "$USER_NAME" \
 --policy-name TerraformCliAssumeRole \
 --policy-document file:///tmp/terraform-cli-user-assume-role.json

8. Create an access key for the user

aws iam create-access-key --user-name "$USER_NAME"

Save the returned:

- AccessKeyId
- SecretAccessKey

9. Configure the AWS CLI user profile

aws configure --profile terraform-cli-user

Enter:

- Access key
- Secret key
- region: us-east-1
- output: json

10. Configure the role profile
    Add this to ~/.aws/config:

[profile terraform-cli-role]
role_arn = arn:aws:iam::YOUR_ACCOUNT_ID:role/terraform-cli-role
source_profile = terraform-cli-user
region = us-east-1

Use your actual account ID.

11. Test the role

AWS_PROFILE=terraform-cli-role aws sts get-caller-identity

You should see an assumed-role ARN ending in terraform-cli-role.

12. Run Terraform bootstrap locally

export AWS_PROFILE=terraform-cli-role
export TF_VAR_GITHUB_REPOSITORY='YOUR_GITHUB_OWNER/YOUR_REPO'
export TF_VAR_TF_STATE_BUCKET='YOUR_UNIQUE_TF_STATE_BUCKET_NAME'

terraform -chdir=terraform/bootstrap init
terraform -chdir=terraform/bootstrap plan
terraform -chdir=terraform/bootstrap apply

13. Copy bootstrap outputs into GitHub repo variables
    After apply:

terraform -chdir=terraform/bootstrap output

Set:

- AWS_TERRAFORM_ROLE_ARN = terraform_role_arn
- TF_STATE_BUCKET = terraform_state_bucket_name
- AWS_REGION = us-east-1

If you want, I can give you the exact commands for the next step: creating the AWS Secrets
Manager bootstrap secret.
