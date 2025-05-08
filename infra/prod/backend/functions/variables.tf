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
    condition     = can(regex("^[0-9A-Fa-f]{32}$", var.cloudflare_account_id))
    error_message = "The cloudflare_account_id must be a 32-character hexadecimal string."
  }
}

variable "dev_database_url" {
  type        = string
  description = "PostgreSQL database connection URL"
  sensitive   = true

  validation {
    condition     = can(regex("^postgres(ql)?://[^:]+:[^@]+@[^/]+/[^?]+(\\?.*)?$", var.dev_database_url))
    error_message = "The dev_database_url must be a valid PostgreSQL connection string in the format postgresql://user:password@host/dbname?query_parameters."
  }
}

variable "prod_database_url" {
  type        = string
  description = "PostgreSQL database connection URL"
  sensitive   = true

  validation {
    condition     = can(regex("^postgres(ql)?://[^:]+:[^@]+@[^/]+/[^?]+(\\?.*)?$", var.prod_database_url))
    error_message = "The prod_database_url must be a valid PostgreSQL connection string in the format postgresql://user:password@host/dbname?query_parameters."
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

  validation {
    condition     = can(regex("^AC[0-9A-Fa-f]{32}$", var.twilio_account_sid))
    error_message = "The twilio_account_sid must start with 'AC' followed by 32 hex characters."
  }
}

variable "twilio_auth_token" {
  type        = string
  description = "Twilio Auth Token"
  sensitive   = true

  validation {
    condition     = can(regex("^[0-9A-Fa-f]{32}$", var.twilio_auth_token))
    error_message = "The twilio_auth_token must be a 32-character hexadecimal string."
  }
}

variable "twilio_sender_phone_number" {
  type        = string
  description = "Twilio Sender Phone Number"
  sensitive   = true

  validation {
    condition     = can(regex("^\\+?[1-9]\\d{1,14}$", var.twilio_sender_phone_number))
    error_message = "The twilio_sender_phone_number must be a valid E.164 formatted number (e.g., '+1234567890')."
  }
}

variable "twilio_target_phone_number" {
  type        = string
  description = "Twilio Target Phone Number to send messages to"
  sensitive   = true

  validation {
    condition     = can(regex("^\\+?[1-9]\\d{1,14}$", var.twilio_target_phone_number))
    error_message = "The twilio_target_phone_number must be a valid E.164 formatted number (e.g., '+1234567890')."
  }
}

variable "apod_image_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket for storing APOD images"

  validation {
    condition     = can(regex("^arn:aws:s3:::[A-Za-z0-9-._]+$", var.apod_image_bucket_arn))
    error_message = "The apod_image_bucket_arn must be a valid S3 ARN (arn:aws:s3:::bucket-name)."
  }
}
