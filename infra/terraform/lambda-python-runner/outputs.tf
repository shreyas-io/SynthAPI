output "function_name" {
  description = "Name of the deployed Python runner Lambda function"
  value       = aws_lambda_function.python_runner.function_name
}

output "function_arn" {
  description = "ARN of the deployed Python runner Lambda function"
  value       = aws_lambda_function.python_runner.arn
}

output "worker_invoker_user_name" {
  description = "IAM user the Cloudflare Worker uses to invoke the Lambda. Create an access key for this user manually in the AWS console and store it in the API secret store."
  value       = aws_iam_user.worker_invoker.name
}

output "worker_invoker_user_arn" {
  description = "ARN of the Worker invoker IAM user."
  value       = aws_iam_user.worker_invoker.arn
}
