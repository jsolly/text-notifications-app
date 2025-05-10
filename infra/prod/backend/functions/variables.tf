variable "website_bucket_name" {
  type        = string
  description = "Name of the website bucket"
}

variable "nasa_api_key" {
  type        = string
  description = "API key for the NASA photo service"
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
}

variable "dev_database_url" {
  type        = string
  description = "PostgreSQL database connection URL"
  sensitive   = true
}

variable "prod_database_url" {
  type        = string
  description = "PostgreSQL database connection URL"
  sensitive   = true
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
  default     = "prod"
}

variable "domain_name" {
  type        = string
  description = "Domain name"
}

variable "twilio" {
  type = object({
    account_sid         = string
    auth_token          = string
    sender_phone_number = string
    target_phone_number = string
  })
  description = "Twilio integration credentials"
  sensitive   = true
}

variable "apod_image_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket for storing APOD images"
}
