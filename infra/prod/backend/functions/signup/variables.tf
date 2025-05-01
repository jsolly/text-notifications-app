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

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID"
  sensitive   = true
}

variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for the Lambda function"
  sensitive   = true
} 
