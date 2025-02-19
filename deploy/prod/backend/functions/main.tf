# module "nasa_photo_fetcher" {
#   source = "./nasa-apod/photo-fetcher"

#   website_bucket_name = var.website_bucket_name
#   nasa_api_key       = var.nasa_api_key
#   lambda_code_bucket = var.lambda_code_bucket
# }

# module "nasa_photo_sender" {
#   source = "./nasa-apod/photo-sender"

#   website_bucket_name        = var.website_bucket_name
#   twilio_account_sid        = var.twilio_account_sid
#   twilio_auth_token         = var.twilio_auth_token
#   twilio_sender_phone_number = var.twilio_sender_phone_number
#   twilio_target_phone_number = var.twilio_target_phone_number
#   lambda_code_bucket        = var.lambda_code_bucket
#   nasa_api_key              = var.nasa_api_key
# }

module "signup_processor" {
  source = "./signup-processor"

  website_bucket_name = var.website_bucket_name
  lambda_code_bucket  = var.lambda_code_bucket
  dev_database_url    = var.dev_database_url
  prod_database_url   = var.prod_database_url
}
