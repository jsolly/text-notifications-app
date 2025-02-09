variable "environment" {
  description = "Environment name (e.g., prod, dev, staging)"
  type        = string
}

variable "website_bucket_name" {
  description = "Name of the website bucket (used to generate database username)"
  type        = string
}

variable "neon_api_key" {
  description = "Neon API Key"
  type        = string
  sensitive   = true
}


variable "neon_project_name" {
  description = "Neon Project Name"
  type        = string
}

variable "neon_database_name" {
  description = "Neon Database Name"
  type        = string
}
