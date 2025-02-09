module "lambda_code_storage" {
  source              = "./storage"
  storage_bucket_name = "${var.website_bucket_name}-${var.environment}-lambda-code"
  environment         = var.environment
}

module "metadata-sql" {
  source              = "./metadata/SQL"
  website_bucket_name = var.website_bucket_name
  environment         = var.environment
  neon_api_key        = var.neon_api_key
  neon_project_name   = var.neon_project_name
  neon_database_name  = var.neon_database_name
}

module "functions" {
  source                         = "./functions"
  website_bucket_name            = var.website_bucket_name
  nasa_api_key                   = var.nasa_api_key
  lambda_code_storage_bucket_arn = module.lambda_code_storage.bucket_arn
  twilio_account_sid             = var.twilio_account_sid
  twilio_auth_token              = var.twilio_auth_token
  twilio_sender_phone_number     = var.twilio_sender_phone_number
  twilio_target_phone_number     = var.twilio_target_phone_number
}
