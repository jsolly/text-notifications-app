locals {
  environment_variables = {
    DATABASE_URL = var.environment == "prod" ? var.prod_database_url : var.dev_database_url
    NASA_API_KEY = var.nasa_api_key
  }
}

# Signup function module
module "signup" {
  source = "./signup"

  website_bucket_name   = var.website_bucket_name
  environment           = var.environment
  domain_name           = var.domain_name
  cloudflare_account_id = var.cloudflare.account_id
  environment_variables = local.environment_variables
}

# APOD function module
module "apod" {
  source = "./apod"

  website_bucket_name   = var.website_bucket_name
  environment           = var.environment
  domain_name           = var.domain_name
  environment_variables = local.environment_variables
  apod_image_bucket_arn = var.apod_image_bucket_arn
}
