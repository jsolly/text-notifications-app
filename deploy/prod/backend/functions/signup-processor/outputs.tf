output "lambda_function_arn" {
  description = "ARN of the signup processor Lambda function"
  value       = aws_lambda_function.signup_processor.arn
}

output "lambda_function_name" {
  description = "Name of the signup processor Lambda function"
  value       = aws_lambda_function.signup_processor.function_name
}

output "lambda_function_invoke_arn" {
  description = "Invoke ARN of the signup processor Lambda function"
  value       = aws_lambda_function.signup_processor.invoke_arn
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_exec.arn
}
