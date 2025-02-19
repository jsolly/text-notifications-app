
output "project_id" {
  description = "The ID of the Neon project"
  value       = neon_project.main.id
}

output "prod_database_name" {
  description = "The name of the created prod database"
  value       = neon_database.prod.name
}

output "dev_database_name" {
  description = "The name of the created dev database"
  value       = neon_database.dev.name
}
