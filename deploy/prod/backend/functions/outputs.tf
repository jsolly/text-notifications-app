output "function_arns" {
  description = "Map of function names to their ARNs"
  value = {
    for name, function in module.lambda_functions :
    name => function.function_arn
  }
}

output "function_names" {
  description = "Map of function names to their actual Lambda function names"
  value = {
    for name, function in module.lambda_functions :
    name => function.function_name
  }
}

output "role_arns" {
  description = "Map of function names to their IAM role ARNs"
  value = {
    for name, function in module.lambda_functions :
    name => function.role_arn
  }
}

output "api_endpoints" {
  description = "Map of function names to their API Gateway endpoints"
  value = {
    for name, function in module.lambda_functions :
    name => function.api_endpoint
  }
}

output "ecr_repository_arns" {
  description = "Map of function names to their ECR repository ARNs"
  value = {
    for name, function in module.ecr_repositories :
    name => function.repository_arn
  }
}

output "ecr_repository_urls" {
  description = "Map of function names to their ECR repository URLs"
  value = {
    for name, function in module.ecr_repositories :
    name => function.repository_url
  }
}
