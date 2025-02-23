output "ecr_repository_urls" {
  description = "Map of Lambda function names to their ECR repository URLs"
  value       = jsonencode({ "signup-processor" = aws_ecr_repository.signup_processor.repository_url })
}

output "signup_processor_api_endpoint" {
  description = "The HTTP API Gateway endpoint URL for the signup processor"
  value       = module.signup_processor_function.api_endpoint
}
