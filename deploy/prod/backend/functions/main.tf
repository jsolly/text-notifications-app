locals {
  signup_processor_function_name = "${var.website_bucket_name}-${var.environment}-signup-processor"
  lambda_code_key                = "signup-processor/deployment.zip"
  environment_variables = {
    DATABASE_URL = var.environment == "prod" ? var.prod_database_url : var.dev_database_url
  }
}

module "signup_processor_function" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"

  function_name         = local.signup_processor_function_name
  lambda_code_bucket    = var.lambda_code_bucket
  lambda_code_key       = local.lambda_code_key
  runtime               = "nodejs22.x"
  environment_variables = local.environment_variables
}
