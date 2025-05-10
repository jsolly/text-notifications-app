variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "prod"
}

variable "cloudflare" {
  description = "Cloudflare configuration"
  type = object({
    account_id                       = string
    api_token                        = string
    zone_id                          = string
    google_search_console_txt_record = string
  })
  sensitive = true
}

variable "website_bucket_name" {
  description = "Name of the website bucket"
  type        = string
}

variable "domain_name" {
  description = "Domain name"
  type        = string
}

variable "nasa_api_key" {
  description = "NASA API Key"
  type        = string
  sensitive   = true
}

variable "twilio" {
  description = "Twilio configuration"
  type = object({
    account_sid         = string
    auth_token          = string
    sender_phone_number = string
    target_phone_number = string
  })
  sensitive = true
}

variable "neon" {
  description = "Neon database configuration"
  type = object({
    api_key       = string
    project_name  = string
    database_name = string
  })
  sensitive = true
}
