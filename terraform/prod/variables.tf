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

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}
variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "google_search_console_txt_record" {
  description = "Google Search Console TXT Record"
  type        = string
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

variable "twilio_account_sid" {
  description = "Twilio Account SID"
  type        = string
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token"
  type        = string
  sensitive   = true
}

variable "twilio_sender_phone_number" {
  description = "Twilio phone number"
  type        = string
  sensitive   = true
}

variable "twilio_target_phone_number" {
  description = "Target phone number"
  type        = string
  sensitive   = true
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
