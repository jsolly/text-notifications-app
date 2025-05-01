locals {
  function_name              = "signup-processor"
  path                       = "/signup"
  http_method                = "POST"
  only_create_ecr_repository = false
}

# Data source to get the Git SHA
data "external" "git_info" {
  program = ["bash", "-c", "echo \"{\\\"sha\\\": \\\"$(git rev-parse --short main)\\\"}\""]
}

# Add signup validator using Cloudflare Turnstile
module "signup_validator" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//validators"

  widget_name           = "${var.website_bucket_name}-signup"
  environment           = var.environment
  cloudflare_account_id = var.cloudflare_account_id
  domain_name           = var.domain_name
  mode                  = "managed"
}

module "ecr_repository" {
  source          = "git::ssh://git@github.com/jsolly/infra_as_code.git//containers"
  repository_name = "${var.website_bucket_name}-${var.environment}-${local.function_name}"
  environment     = var.environment
  tags            = {}
}

# Create Lambda function
module "lambda_function" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"
  count  = local.only_create_ecr_repository ? 0 : 1

  function_name = "${var.website_bucket_name}-${var.environment}-${local.function_name}"
  environment   = var.environment
  environment_variables = merge(var.environment_variables, {
    TURNSTILE_SECRET_KEY = sensitive(module.signup_validator.secret_key)
  })
  s3_access_arns      = []
  tags                = {}
  ecr_repository_arn  = module.ecr_repository.repository_arn
  image_uri           = "${module.ecr_repository.repository_url}:${data.external.git_info.result.sha}"
  domain_name         = var.domain_name
  api_path            = local.path
  http_method         = local.http_method
  schedule_expression = ""
} 
