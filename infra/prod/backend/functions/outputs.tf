output "function_arns" {
  description = "Map of function names to their ARNs"
  value = {
    "signup-processor"   = module.signup.function_arn
    "apod-photo-fetcher" = module.apod.function_arn
  }
}

output "function_names" {
  description = "Map of function names to their actual Lambda function names"
  value = {
    "signup-processor"   = module.signup.function_name
    "apod-photo-fetcher" = module.apod.function_name
  }
}

output "role_arns" {
  description = "Map of function names to their IAM role ARNs"
  value = {
    "signup-processor"   = module.signup.role_arn
    "apod-photo-fetcher" = module.apod.role_arn
  }
}

output "api_endpoints" {
  description = "Map of function names to their API Gateway endpoints"
  value = {
    "signup-processor"   = module.signup.api_endpoint
    "apod-photo-fetcher" = module.apod.api_endpoint
  }
}

output "ecr_repository_arns" {
  description = "Map of function names to their ECR repository ARNs"
  value = {
    "signup-processor"   = module.signup.ecr_repository_arn
    "apod-photo-fetcher" = module.apod.ecr_repository_arn
  }
}

output "ecr_repository_urls" {
  description = "Map of function names to their ECR repository URLs"
  value = {
    "signup-processor"   = module.signup.ecr_repository_url
    "apod-photo-fetcher" = module.apod.ecr_repository_url
  }
}

output "turnstile_site_key" {
  description = "The site key for the Turnstile widget"
  value       = module.signup.turnstile_site_key
}
