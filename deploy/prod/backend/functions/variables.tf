variable "website_bucket_name" {
  type        = string
  description = "Name of the website bucket"
}

variable "nasa_api_key" {
  type        = string
  description = "API key for the NASA photo service"
  sensitive   = true
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

variable "lambda_code_bucket" {
  type        = string
  description = "Name of the S3 bucket containing Lambda deployment packages"
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
  description = "Environment name (e.g., prod, dev)"
  default     = "prod"
}

variable "function_handler" {
  type        = string
  description = "The handler for the lambda function"
  default     = "index.handler"
}

variable "runtime" {
  type        = string
  description = "The runtime for the lambda function"
  default     = "nodejs22.x"
}

variable "function_timeout" {
  type        = number
  description = "The timeout for the lambda function"
  default     = 30
}

variable "function_memory_size" {
  type        = number
  description = "The memory size for the lambda function"
  default     = 128
}

variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for the Lambda function"
  default     = {}
}

variable "s3_access_arns" {
  type        = list(string)
  description = "List of S3 bucket ARNs the Lambda function needs access to"
  default     = []
}

variable "additional_policy_arns" {
  type        = list(string)
  description = "List of additional IAM policy ARNs to attach to the Lambda role"
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
