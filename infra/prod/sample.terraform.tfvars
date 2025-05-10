# Global configuration
aws_region = "us-east-1"

# Frontend configuration
environment                      = "prod"
domain_name                      = "example.com"
website_bucket_name              = "example-website"

# Database configuration
neon = {
  api_key        = "<neon_api_key>"
  project_name   = "<neon_project_name>"
  database_name  = "<neon_database_name>"
}

# Cloudflare configuration
cloudflare = {
  account_id                      = "<cloudflare_account_id>"
  api_token                       = "<cloudflare_api_token>"
  zone_id                         = "<cloudflare_zone_id>"
  google_search_console_txt_record = "\"google-site-verification=<verification_code>\""
}

# Third party API keys
twilio = {
  account_sid         = "<twilio_account_sid>"
  auth_token          = "<twilio_auth_token>"
  sender_phone_number = "<twilio_sender_phone_number>"
  target_phone_number = "<twilio_target_phone_number>"
}
nasa_api_key = "<nasa_api_key>"


