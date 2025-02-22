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
