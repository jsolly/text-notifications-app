module "database" {
  source              = "./database"
  website_bucket_name = var.website_bucket_name
  neon_api_key        = var.neon.api_key
  neon_project_name   = var.neon.project_name
  neon_database_name  = var.neon.database_name
}

locals {
  # Use the provided values if non-empty, otherwise use module-generated values
  dev_database_url  = module.database.dev_database_url
  prod_database_url = module.database.prod_database_url
}

module "functions" {
  source                = "./functions"
  website_bucket_name   = var.website_bucket_name
  twilio                = var.twilio
  cloudflare            = var.cloudflare
  cloudflare_account_id = var.cloudflare.account_id
  dev_database_url      = local.dev_database_url
  prod_database_url     = local.prod_database_url
  domain_name           = var.domain_name
}
