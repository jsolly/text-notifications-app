locals {
  function_name              = "apod-photo-fetcher"
  path                       = "/apod-photo-fetcher"
  http_method                = "GET"
  schedule_expression        = "cron(10 0 * * ? *)" # Once at 12:10 AM every day
  only_create_ecr_repository = true
}

# Use the Git SHA of the main branch to tag the container image
data "external" "git_info" {
  program = ["bash", "-c", "echo \"{\\\"sha\\\": \\\"$(git rev-parse --short main)\\\"}\""]
}

module "ecr_repository" {
  source          = "git::ssh://git@github.com/jsolly/infra_as_code.git//containers"
  repository_name = "${var.website_bucket_name}-${var.environment}-${local.function_name}"
  environment     = var.environment
}
module "lambda_function" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"
  count  = local.only_create_ecr_repository ? 0 : 1

  function_name         = "${var.website_bucket_name}-${var.environment}-${local.function_name}"
  environment           = var.environment
  environment_variables = var.environment_variables
  s3_access_arns        = [var.apod_image_bucket_arn]
  ecr_repository_arn    = module.ecr_repository.repository_arn
  image_uri             = "${module.ecr_repository.repository_url}:${data.external.git_info.result.sha}"
  domain_name           = var.domain_name
  api_path              = local.path
  http_method           = local.http_method
  schedule_expression   = local.schedule_expression
}
