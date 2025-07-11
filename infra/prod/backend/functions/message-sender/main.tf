locals {
  function_name              = "message-sender"
  only_create_ecr_repository = false
  function_name_prefix       = replace(var.website_bucket_name, ".", "-")
}

# Use the Git SHA of the main branch to tag the container image
data "external" "git_info" {
  program = ["bash", "-c", "echo \"{\\\"sha\\\": \\\"$(git rev-parse --short main)\\\"}\""]
}

module "ecr_repository" {
  source          = "git::ssh://git@github.com/jsolly/infra_as_code.git//containers"
  repository_name = "${local.function_name_prefix}-${var.environment}-${local.function_name}"
  environment     = var.environment
}

module "lambda_function" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"
  count  = local.only_create_ecr_repository ? 0 : 1

  function_name       = "${local.function_name_prefix}-${var.environment}-${local.function_name}"
  environment         = var.environment
  domain_name         = var.domain_name
  api_path            = "/send-messages"
  http_method         = "POST"
  schedule_expression = "rate(1 hour)"

  environment_variables = merge(var.environment_variables, {
    TWILIO_ACCOUNT_SID         = var.twilio.account_sid
    TWILIO_AUTH_TOKEN          = var.twilio.auth_token
    TWILIO_SENDER_PHONE_NUMBER = var.twilio.sender_phone_number
    DATABASE_URL               = var.prod_database_url
  })
  ecr_repository_arn = module.ecr_repository.repository_arn
  image_uri          = "${module.ecr_repository.repository_url}:${data.external.git_info.result.sha}"
}
