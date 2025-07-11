output "function_arns" {
  description = "Map of function names to their ARNs"
  value = {
    "signup-processor" = module.signup.function_arn
    "message-sender"   = module.message_sender.function_arn
  }
}

output "function_names" {
  description = "Map of function names to their actual Lambda function names"
  value = {
    "signup-processor" = module.signup.function_name
    "message-sender"   = module.message_sender.function_name
  }
}

output "role_arns" {
  description = "Map of function names to their IAM role ARNs"
  value = {
    "signup-processor" = module.signup.role_arn
    "message-sender"   = module.message_sender.role_arn
  }
}

output "api_endpoints" {
  description = "Map of function names to their API Gateway endpoints"
  value = {
    "signup-processor" = module.signup.api_endpoint
    "message-sender"   = module.message_sender.api_endpoint
  }
}

output "ecr_repository_arns" {
  description = "Map of function names to their ECR repository ARNs"
  value = {
    "signup-processor" = module.signup.ecr_repository_arn
    "message-sender"   = module.message_sender.ecr_repository_arn
  }
}

output "ecr_repository_urls" {
  description = "Map of function names to their ECR repository URLs"
  value = {
    "signup-processor" = module.signup.ecr_repository_url
    "message-sender"   = module.message_sender.ecr_repository_url
  }
}

output "turnstile_site_key" {
  description = "The site key for the Turnstile widget"
  value       = module.signup.turnstile_site_key
}

output "message_sender_cloudwatch_schedule_arn" {
  description = "The ARN of the CloudWatch schedule that triggers the message-sender function"
  value       = module.message_sender.cloudwatch_schedule_arn
}
