output "function_arn" {
  description = "The ARN of the message-sender function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].function_arn
}

output "function_name" {
  description = "The name of the message-sender function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].function_name
}

output "role_arn" {
  description = "The ARN of the IAM role for the message-sender function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].role_arn
}

output "api_endpoint" {
  description = "The HTTP API Gateway endpoint URL for the message-sender function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].api_endpoint
}

output "cloudwatch_schedule_arn" {
  description = "ARN of the CloudWatch schedule for the message-sender function"
  value       = local.only_create_ecr_repository ? null : module.lambda_function[0].cloudwatch_schedule_arn
}

output "ecr_repository_arn" {
  description = "The ARN of the ECR repository for the message-sender function"
  value       = module.ecr_repository.repository_arn
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository for the message-sender function"
  value       = module.ecr_repository.repository_url
}
