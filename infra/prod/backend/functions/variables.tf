variable "website_bucket_name" {
  type        = string
  description = "Name of the website bucket"
}

variable "nasa_api_key" {
  type        = string
  description = "API key for the NASA photo service"
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID"
  sensitive   = true
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
  description = "Domain name"
  type        = string
}

variable "twilio_account_sid" {
  type        = string
  description = "Twilio Account SID"
  sensitive   = true
}

variable "twilio_auth_token" {
  type        = string
  description = "Twilio Auth Token"
  sensitive   = true
}

variable "twilio_sender_phone_number" {
  type        = string
  description = "Twilio Sender Phone Number"
  sensitive   = true
}

variable "twilio_target_phone_number" {
  type        = string
  description = "Twilio Target Phone Number to send messages to"
  sensitive   = true
}

variable "apod_image_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket for storing APOD images"
}
