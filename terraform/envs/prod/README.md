# SynthAPI production AWS infrastructure

This Terraform environment provisions the only two AWS services used by the project:

- **RDS PostgreSQL** (`db.t4g.micro` by default) for application data.
- **Lambda function** for executing Python code via `pyodide`.

The API itself runs on Cloudflare Workers and connects to RDS through Hyperdrive.

## Resources

- RDS PostgreSQL — created inline in `main.tf` (publicly accessible instance in the default VPC).
- `../../../infra/terraform/lambda-python-runner` — builds and deploys the Python runner Lambda.

## Usage

1. Copy the example variables and fill in `DB_PASSWORD`:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Initialize Terraform. The backend uses S3 with a lockfile; pass the bucket name from the bootstrap step:

   ```bash
   terraform init -backend-config="bucket=synthapi-terraform-state"
   ```

3. Plan and apply:

   ```bash
   terraform plan
   terraform apply
   ```

4. After apply, store the outputs in the API secret store (Infisical):
   - `DB_HOST` = `rds_endpoint`
   - `DB_PORT` = `rds_port` (default 5432)
   - `DB_NAME` = `rds_db_name`
   - `DB_USER` = `rds_username`
   - `DB_PASSWORD` = the value from `terraform.tfvars`
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` = create an access key for the `python_runner_lambda_invoker_user_name` output (see **Create the access key** below)
   - `AWS_REGION` = `AWS_REGION`
   - `PYTHON_RUNNER_LAMBDA_FUNCTION_NAME` = `python_runner_lambda_function_name`

   ### Create the access key

   The IAM user has a scoped policy granting **only** `lambda:InvokeFunction` on the Python runner Lambda (principle of least privilege). Terraform creates the user but not the access key itself — this keeps secret material out of Terraform state.

   **Option A — AWS Console:**

   1. Get the user name: `terraform output python_runner_lambda_invoker_user_name`
   2. Open [IAM Console → Users](https://us-east-1.console.aws.amazon.com/iam/home#/users)
   3. Click the user (e.g., `synthapi-prod-python-runner-invoker`)
   4. **Security credentials** → **Create access key**
   5. Select **Application running outside AWS** → **Create access key**
   6. Copy both values immediately (shown only once):
      - **Access key ID** → store as `AWS_ACCESS_KEY_ID`
      - **Secret access key** → store as `AWS_SECRET_ACCESS_KEY`

   **Option B — AWS CLI:**

   ```bash
   USER_NAME=$(terraform output -raw python_runner_lambda_invoker_user_name)
   aws iam create-access-key --user-name "$USER_NAME" --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
   ```

   This prints two tab-separated values: first is `AWS_ACCESS_KEY_ID`, second is `AWS_SECRET_ACCESS_KEY`.

5. For the GitHub Actions migrate job, create a single `DATABASE_URL` repository secret:
   `postgres://<DB_USER>:<DB_PASSWORD>@<rds_endpoint>:<rds_port>/<DB_NAME>`

## Security notes

- `DB_ALLOWED_CIDR_BLOCKS` defaults to `0.0.0.0/0` for initial setup. Restrict it to Cloudflare IP ranges before going live.
- Use the RDS master password only for Terraform; create a separate application user if needed.
