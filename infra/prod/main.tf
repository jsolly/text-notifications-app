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
  api_token = var.cloudflare.api_token
}

module "backend" {
  source = "./backend"

  website_bucket_name = var.website_bucket_name
  nasa_api_key        = var.nasa_api_key
  twilio              = var.twilio
  cloudflare          = var.cloudflare
  neon                = var.neon
  domain_name         = var.domain_name
}

# Frontend configuration
module "dns" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//static_website/dns"

  cloudflare_zone_id               = var.cloudflare.zone_id
  domain_name                      = var.domain_name
  website_bucket_name              = var.website_bucket_name
  aws_region                       = var.aws_region
  google_search_console_txt_record = var.cloudflare.google_search_console_txt_record
}

module "website_storage" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//static_website/storage"

  website_bucket_name = var.domain_name
  website_config = {
    index_document = "index.html"
    error_document = "500.html"
  }
}
