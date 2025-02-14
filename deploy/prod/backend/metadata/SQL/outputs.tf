
output "project_id" {
  description = "The ID of the Neon project"
  value       = neon_project.text_notifications.id
}

output "database_name" {
  description = "The name of the created database"
  value       = neon_database.notifications_db.name
}
