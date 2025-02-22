output "ecr_repository_url" {
  description = "The URL of the ECR repository for the signup processor"
  value       = module.backend.ecr_repository_url
}

# output "dev_database_url" {
#   value     = module.backend.dev_database_url
#   sensitive = true
# }

# output "prod_database_url" {
#   value     = module.backend.prod_database_url
#   sensitive = true
# }
