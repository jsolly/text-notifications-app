variable "website_bucket_name" {
  type        = string
  description = "Name of the website bucket"
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
}

variable "domain_name" {
  type        = string
  description = "Domain name for CORS configuration (e.g. textnotifications.app)"
}

variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for the Lambda function"
  sensitive   = true
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

variable "prod_database_url" {
  type        = string
  description = "PostgreSQL database connection URL"
  sensitive   = true
}
