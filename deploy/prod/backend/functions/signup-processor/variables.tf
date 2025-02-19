
variable "website_bucket_name" {
  type        = string
  description = "The name of the website bucket"
}


variable "aws_region" {
  type        = string
  description = "AWS region to deploy resources"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., prod, dev)"
  default     = "prod"
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
