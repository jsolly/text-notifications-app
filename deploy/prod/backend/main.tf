module "database" {
  source              = "./database"
  website_bucket_name = var.website_bucket_name
  neon_api_key        = var.neon_api_key
  neon_project_name   = var.neon_project_name
  neon_database_name  = var.neon_database_name
}

module "functions" {
  source                     = "./functions"
  website_bucket_name        = var.website_bucket_name
  nasa_api_key               = var.nasa_api_key
  twilio_account_sid         = var.twilio_account_sid
  twilio_auth_token          = var.twilio_auth_token
  twilio_sender_phone_number = var.twilio_sender_phone_number
  twilio_target_phone_number = var.twilio_target_phone_number
  dev_database_url           = module.database.dev_database_url
  prod_database_url          = module.database.prod_database_url
  domain_name                = var.domain_name
}
