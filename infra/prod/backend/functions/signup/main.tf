locals {
  function_name              = "signup-processor"
  path                       = "/signup"
  http_method                = "POST"
  only_create_ecr_repository = true
  function_name_prefix       = replace(var.website_bucket_name, ".", "-")
}

# Use the Git SHA of the main branch to tag the container image
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
  repository_name = "${local.function_name_prefix}-${var.environment}-${local.function_name}"
  environment     = var.environment
}

# Create Lambda function
module "lambda_function" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"
  count  = local.only_create_ecr_repository ? 0 : 1

  function_name = "${local.function_name_prefix}-${var.environment}-${local.function_name}"
  environment   = var.environment
  environment_variables = merge(var.environment_variables, {
    TURNSTILE_SECRET_KEY = sensitive(module.signup_validator.secret_key)
  })
  ecr_repository_arn = module.ecr_repository.repository_arn
  image_uri          = "${module.ecr_repository.repository_url}:${data.external.git_info.result.sha}"
  domain_name        = var.domain_name
  api_path           = local.path
  http_method        = local.http_method
}
