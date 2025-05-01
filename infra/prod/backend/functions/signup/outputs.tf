output "function_arn" {
  description = "The ARN of the signup function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].function_arn
}

output "function_name" {
  description = "The name of the signup function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].function_name
}

output "role_arn" {
  description = "The ARN of the IAM role for the signup function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].role_arn
}

output "api_endpoint" {
  description = "The API Gateway endpoint for the signup function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].api_endpoint
}

output "ecr_repository_arn" {
  description = "The ARN of the ECR repository for the signup function"
  value       = module.ecr_repository.repository_arn
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository for the signup function"
  value       = module.ecr_repository.repository_url
}

output "turnstile_site_key" {
  description = "The site key for the Turnstile widget"
  value       = module.signup_validator.site_key
} 
