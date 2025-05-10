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

variable "dev_database_url" {
  type        = string
  description = "PostgreSQL database connection URL for dev environment"
  sensitive   = true
  default     = ""
}

variable "prod_database_url" {
  type        = string
  description = "PostgreSQL database connection URL for prod environment"
  sensitive   = true
  default     = ""
}

variable "apod_image_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket for storing APOD images"
  default     = ""
}
