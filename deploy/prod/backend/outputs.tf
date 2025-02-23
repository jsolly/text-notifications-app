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

output "api_endpoints" {
  description = "Map of function names to their API Gateway endpoints"
  value       = module.functions.api_endpoints
}

output "turnstile_site_key" {
  description = "The site key for the Turnstile widget"
  value       = module.functions.turnstile_site_key
}
