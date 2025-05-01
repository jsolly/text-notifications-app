variable "website_bucket_name" {
  type        = string
  description = "Name of the website bucket"
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
}

variable "domain_name" {
  description = "Domain name"
  type        = string
}

variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for the Lambda function"
  sensitive   = true
}

variable "apod_image_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket for storing APOD images"
} 
