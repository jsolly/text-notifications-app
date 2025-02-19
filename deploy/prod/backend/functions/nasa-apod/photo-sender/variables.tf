variable "environment" {
  type        = string
  description = "The environment of the website"
  default     = "prod"
}

variable "website_bucket_name" {
  type        = string
  description = "The name of the website bucket"
}

variable "lambda_code_storage_bucket_arn" {
  type        = string
  description = "The ARN of the lambda code storage bucket"
}

variable "function_handler" {
  type        = string
  description = "The handler for the lambda function"
  default     = "index.handler"
}

variable "runtime" {
  type        = string
  description = "The runtime for the lambda function"
  default     = "python3.12"
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

variable "twilio_account_sid" {
  type        = string
  description = "The Twilio account SID"
}

variable "twilio_auth_token" {
  type        = string
  description = "The Twilio auth token"
}

variable "twilio_sender_phone_number" {
  type        = string
  description = "The Twilio sender phone number"
}

variable "twilio_target_phone_number" {
  type        = string
  description = "The Twilio target phone number"
}

variable "nasa_api_key" {
  type        = string
  description = "The NASA API key"
}

variable "database_url" {
  type        = string
  description = "PostgreSQL database connection URL"
  sensitive   = true
}
