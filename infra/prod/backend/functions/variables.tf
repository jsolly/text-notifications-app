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

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.cloudflare_account_id))
    error_message = "The cloudflare_account_id must be a 32-character hexadecimal string."
  }
}

variable "dev_database_url" {
  type        = string
  description = "PostgreSQL database connection URL"
  sensitive   = true

  validation {
    condition     = can(regex("^postgresql://.*@.*:[0-9]+/.*$", var.dev_database_url))
    error_message = "The dev_database_url must be a valid PostgreSQL connection string in the format postgresql://user:password@host:port/dbname."
  }
}

variable "prod_database_url" {
  type        = string
  description = "PostgreSQL database connection URL"
  sensitive   = true

  validation {
    condition     = can(regex("^postgresql://.*@.*:[0-9]+/.*$", var.prod_database_url))
    error_message = "The prod_database_url must be a valid PostgreSQL connection string in the format postgresql://user:password@host:port/dbname."
  }
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
  default     = "prod"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "The environment value must be either 'dev' or 'prod'."
  }
}

variable "domain_name" {
  description = "Domain name"
  type        = string

  validation {
    condition     = can(regex("^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$", var.domain_name))
    error_message = "The domain_name must be a valid domain name format."
  }
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
