output "ecr_repository_urls" {
  description = "Map of Lambda function names to their ECR repository URLs"
  value       = module.backend.ecr_repository_urls
}

output "dev_database_url" {
  value     = module.backend.dev_database_url
  sensitive = true
}

output "prod_database_url" {
  value     = module.backend.prod_database_url
  sensitive = true
}

output "signup_processor_api_endpoint" {
  description = "The HTTP API Gateway endpoint URL for the signup processor"
  value       = module.backend.signup_processor_api_endpoint
}
