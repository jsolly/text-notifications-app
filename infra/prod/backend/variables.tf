variable "website_bucket_name" {
  type        = string
  description = "Base name of the website bucket"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., prod, dev, staging)"
  default     = "prod"
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

variable "neon" {
  type = object({
    api_key       = string
    project_name  = string
    database_name = string
  })
  description = "Neon database configuration"
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name"
  type        = string
}
