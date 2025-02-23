output "ecr_repository_urls" {
  description = "Map of Lambda function names to their ECR repository URLs"
  value       = module.backend.ecr_repository_urls
}
output "api_endpoints" {
  description = "Map of function names to their API Gateway endpoints"
  value       = module.backend.api_endpoints
}

output "dev_database_url" {
  value     = module.backend.dev_database_url
  sensitive = true
}

output "prod_database_url" {
  value     = module.backend.prod_database_url
  sensitive = true
}

