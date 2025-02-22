output "ecr_repository_urls" {
  description = "Map of Lambda function names to their ECR repository URLs"
  value = {
    signup_processor = aws_ecr_repository.signup_processor.repository_url
    # Add other function repositories here as they are created, for example:
    # email_processor = aws_ecr_repository.email_processor.repository_url
    # notification_processor = aws_ecr_repository.notification_processor.repository_url
  }
}
