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

variable "twilio_account_sid" {
  type        = string
  description = "Twilio account SID"
  sensitive   = true
}

variable "twilio_auth_token" {
  type        = string
  description = "Twilio auth token"
  sensitive   = true
}

variable "twilio_sender_phone_number" {
  type        = string
  description = "Twilio sender phone number"
  sensitive   = true
}

variable "twilio_target_phone_number" {
  type        = string
  description = "Twilio target phone number"
  sensitive   = true
}

variable "neon_api_key" {
  type        = string
  description = "Neon API Key"
  sensitive   = true
}

variable "neon_project_name" {
  type        = string
  description = "Neon Project Name"
}

variable "neon_database_name" {
  type        = string
  description = "Neon Database Name"
}

variable "domain_name" {
  description = "Domain name"
  type        = string
}
