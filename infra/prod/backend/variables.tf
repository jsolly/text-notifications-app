variable "website_bucket_name" {
  type        = string
  description = "Base name of the website bucket"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., prod, dev, staging)"
  default     = "prod"
}

variable "nasa_api_key" {
  type        = string
  description = "API key for the NASA photo service"
  sensitive   = true
}

variable "twilio" {
  type = object({
    account_sid         = string
    auth_token          = string
    sender_phone_number = string
    target_phone_number = string
  })
  description = "Twilio configuration"
  sensitive   = true
}

variable "cloudflare" {
  type = object({
    account_id                       = string
    api_token                        = string
    zone_id                          = string
    google_search_console_txt_record = string
  })
  description = "Cloudflare configuration"
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID"
  default     = ""
}

variable "neon" {
  type = object({
    api_key       = string
    project_name  = string
    database_name = string
  })
  description = "Neon database configuration"
  sensitive   = true
}

variable "neon_api_key" {
  type        = string
  description = "Neon API Key"
  default     = ""
  sensitive   = true
}

variable "neon_project_name" {
  type        = string
  description = "Neon Project Name"
  default     = ""
}

variable "neon_database_name" {
  type        = string
  description = "Neon Database Name"
  default     = ""
}

variable "domain_name" {
  description = "Domain name"
  type        = string
}
