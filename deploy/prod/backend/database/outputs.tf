output "prod_database_url" {
  description = "The database connection URL"
  value       = "postgresql://${neon_role.prod.name}:${neon_role.prod.password}@${neon_project.main.branch.endpoint.host}/${neon_database.prod.name}?sslmode=require"
  sensitive   = true
}

output "dev_database_url" {
  description = "The database connection URL"
  value       = "postgresql://${neon_role.dev.name}:${neon_role.dev.password}@${neon_project.main.branch.endpoint.host}/${neon_database.dev.name}?sslmode=require"
  sensitive   = true
}
