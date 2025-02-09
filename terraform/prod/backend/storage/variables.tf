variable "expiration_days" {
  description = "Number of days after which items in the storage bucket expire"
  type        = number
  default     = 30
}


variable "environment" {
  type        = string
  description = "Environment name (e.g., prod, dev, staging)"
  default     = "prod"
}

variable "storage_bucket_name" {
  type        = string
  description = "Name of the storage bucket"
}
