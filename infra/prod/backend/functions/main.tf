locals {
  environment_variables = {
    DATABASE_URL = var.environment == "prod" ? var.prod_database_url : var.dev_database_url
  }

  # Define all lambda functions here
  lambda_functions = {
    "signup-processor" = {
      path                       = "/signup"
      http_method                = "POST"
      only_create_ecr_repository = false
    }
    # Add more functions here as needed, for example:
    # "email-processor" = {
    #   path         = "/email"
    #   http_method  = "POST"
    # }
  }
}

# Data source to get the Git SHA
data "external" "git_info" {
  program = ["bash", "-c", "echo \"{\\\"sha\\\": \\\"$(git rev-parse --short HEAD)\\\"}\""]
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

module "ecr_repositories" {
  source          = "git::ssh://git@github.com/jsolly/infra_as_code.git//containers"
  for_each        = local.lambda_functions
  repository_name = "${var.website_bucket_name}-${var.environment}-${each.key}"
  environment     = var.environment
  tags            = {}
}

# Only create Lambda functions for non-bootstrapped functions
module "lambda_functions" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"
  for_each = {
    for k, v in local.lambda_functions : k => v
    if !lookup(v, "only_create_ecr_repository", false)
  }

  function_name         = "${var.website_bucket_name}-${var.environment}-${each.key}"
  environment           = var.environment
  environment_variables = local.environment_variables
  s3_access_arns        = []
  tags                  = {}
  ecr_repository_arn    = module.ecr_repositories[each.key].repository_arn
  image_uri             = "${module.ecr_repositories[each.key].repository_url}:${data.external.git_info.result.sha}"
  domain_name           = var.domain_name
  api_path              = each.value.path
  http_method           = each.value.http_method
  turnstile_secret_key  = module.signup_validator.secret_key
}
