output "dev_database_url" {
  value     = module.database.dev_database_url
  sensitive = true
}

output "prod_database_url" {
  value     = module.database.prod_database_url
  sensitive = true
}
