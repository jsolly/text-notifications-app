variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "The environment value must be either 'dev' or 'prod'."
  }
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

  validation {
    condition     = can(regex("^[0-9A-Fa-f]{32}$", var.cloudflare.account_id))
    error_message = "The cloudflare.account_id must be a 32-character hexadecimal string."
  }
}

variable "website_bucket_name" {
  description = "Name of the website bucket"
  type        = string
}

variable "domain_name" {
  description = "Domain name"
  type        = string

  validation {
    condition     = can(regex("^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$", var.domain_name))
    error_message = "The domain_name must be a valid domain name format."
  }
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

variable "neon" {
  description = "Neon database configuration"
  type = object({
    api_key       = string
    project_name  = string
    database_name = string
  })
  sensitive = true
}
