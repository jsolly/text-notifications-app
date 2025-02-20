locals {
  signup_processor_function_name = "${var.website_bucket_name}-${var.environment}-signup-processor"
  lambda_code_key                = "signup-processor/deployment.zip"
}

module "signup_processor_function" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"

  function_name          = local.signup_processor_function_name
  environment            = var.environment
  lambda_code_bucket     = var.lambda_code_bucket
  lambda_code_key        = local.lambda_code_key
  function_handler       = var.function_handler
  runtime                = var.runtime
  function_timeout       = var.function_timeout
  function_memory_size   = var.function_memory_size
  environment_variables  = var.environment_variables
  s3_access_arns         = var.s3_access_arns
  additional_policy_arns = var.additional_policy_arns
  tags                   = var.tags
}
