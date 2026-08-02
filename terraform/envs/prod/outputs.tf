output "rds_endpoint" {
  description = "RDS endpoint to store as DB_HOST in the API secrets."
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS port to store as DB_PORT in the API secrets."
  value       = aws_db_instance.postgres.port
}

output "rds_db_name" {
  description = "RDS database name to store as DB_NAME."
  value       = aws_db_instance.postgres.db_name
}

output "rds_username" {
  description = "RDS master username to store as DB_USER."
  value       = aws_db_instance.postgres.username
}

output "python_runner_lambda_function_name" {
  description = "Name of the deployed Python runner Lambda."
  value       = module.lambda_python_runner.function_name
}

output "python_runner_lambda_function_arn" {
  description = "ARN of the deployed Python runner Lambda."
  value       = module.lambda_python_runner.function_arn
}

output "python_runner_lambda_invoker_user_name" {
  description = "IAM user name to create an access key for in the AWS console. Store AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in the API secret store."
  value       = module.lambda_python_runner.worker_invoker_user_name
}
