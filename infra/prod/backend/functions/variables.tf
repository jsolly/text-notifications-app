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
  type        = string
  description = "Domain name"

  validation {
    condition     = can(regex("^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$", var.domain_name))
    error_message = "The domain_name must be a valid domain name format."
  }
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

  validation {
    condition = alltrue([
      can(regex("^AC[0-9A-Fa-f]{32}$", var.twilio.account_sid)),
      can(regex("^[0-9A-Fa-f]{32}$", var.twilio.auth_token)),
      can(regex("^\\+?[1-9]\\d{1,14}$", var.twilio.sender_phone_number)),
      can(regex("^\\+?[1-9]\\d{1,14}$", var.twilio.target_phone_number)),
    ])
    error_message = "Each Twilio credential must match its respective format."
  }
}

variable "apod_image_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket for storing APOD images"

  validation {
    condition     = can(regex("^arn:aws:s3:::[a-z0-9.-]+$", var.apod_image_bucket_arn))
    error_message = "The apod_image_bucket_arn must be a valid S3 ARN (arn:aws:s3:::bucket-name) using lowercase letters, numbers, dots, and hyphens."
  }
}
