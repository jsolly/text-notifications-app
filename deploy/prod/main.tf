terraform {
  backend "s3" {
    bucket         = "jsolly-general-tf-state"
    key            = "prod/text-notifications/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-locking"

    assume_role = {
      role_arn = "arn:aws:iam::541310242108:role/TerraformStateBucketAccess"
    }
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.0.0-alpha1"
    }
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = "prod-admin"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

module "backend" {
  source = "./backend"

  website_bucket_name        = var.website_bucket_name
  nasa_api_key               = var.nasa_api_key
  twilio_account_sid         = var.twilio_account_sid
  twilio_auth_token          = var.twilio_auth_token
  twilio_sender_phone_number = var.twilio_sender_phone_number
  twilio_target_phone_number = var.twilio_target_phone_number
  neon_api_key               = var.neon_api_key
  neon_project_name          = var.neon_project_name
  neon_database_name         = var.neon_database_name
  domain_name                = var.domain_name
}

# Frontend configuration
module "dns" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//static_website/dns"

  cloudflare_zone_id               = var.cloudflare_zone_id
  domain_name                      = var.domain_name
  website_bucket_name              = var.website_bucket_name
  aws_region                       = var.aws_region
  google_search_console_txt_record = var.google_search_console_txt_record
}

module "website_storage" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//static_website/storage"

  website_bucket_name = var.domain_name
  website_config = {
    index_document = "index.html"
    error_document = "500.html"
  }
}
