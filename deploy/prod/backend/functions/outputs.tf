output "ecr_repository_url" {
  description = "The URL of the ECR repository for the signup processor"
  value       = aws_ecr_repository.signup_processor.repository_url
}
