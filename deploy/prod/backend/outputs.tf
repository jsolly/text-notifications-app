output "dev_database_url" {
  value     = module.database.dev_database_url
  sensitive = true
}

output "prod_database_url" {
  value     = module.database.prod_database_url
  sensitive = true
}

output "ecr_repository_urls" {
  description = "Map of Lambda function names to their ECR repository URLs"
  value       = module.functions.ecr_repository_urls
}

output "signup_processor_api_endpoint" {
  description = "The HTTP API Gateway endpoint URL for the signup processor"
  value       = module.functions.signup_processor_api_endpoint
}
