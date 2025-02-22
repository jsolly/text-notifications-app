output "ecr_repository_urls" {
  description = "Map of Lambda function names to their ECR repository URLs"
  value       = jsonencode({ "signup-processor" = aws_ecr_repository.signup_processor.repository_url })
}
