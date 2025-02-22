output "dev_database_url" {
  value     = module.database.dev_database_url
  sensitive = true
}

output "prod_database_url" {
  value     = module.database.prod_database_url
  sensitive = true
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository for the signup processor"
  value       = module.functions.ecr_repository_url
}
