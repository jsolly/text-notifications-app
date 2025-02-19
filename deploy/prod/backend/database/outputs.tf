output "prod_database_url" {
  description = "The database connection URL"
  value       = "postgresql://${neon_role.prod.name}:${neon_role.prod.password}@${neon_database.prod.branch_id}.us-east-1.aws.neon.tech/${neon_database.prod.name}?sslmode=require"
  sensitive   = true
}

output "dev_database_url" {
  description = "The database connection URL"
  value       = "postgresql://${neon_role.dev.name}:${neon_role.dev.password}@${neon_database.dev.branch_id}.us-east-1.aws.neon.tech/${neon_database.dev.name}?sslmode=require"
  sensitive   = true
}
