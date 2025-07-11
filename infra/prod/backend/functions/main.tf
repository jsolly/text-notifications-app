locals {
  environment_variables = {
    DATABASE_URL = var.environment == "prod" ? var.prod_database_url : var.dev_database_url
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

# Message-sender function module
module "message_sender" {
  source = "./message-sender"

  website_bucket_name   = var.website_bucket_name
  environment           = var.environment
  domain_name           = var.domain_name
  environment_variables = local.environment_variables
  twilio                = var.twilio
  prod_database_url     = var.prod_database_url
}


