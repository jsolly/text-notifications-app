terraform {
  required_providers {
    neon = {
      source  = "terraform-community-providers/neon"
      version = "~> 0.1.8"
    }
  }
}

provider "neon" {
  token = var.neon_api_key
}

resource "neon_project" "main" {
  name      = var.neon_project_name
  region_id = "aws-us-east-1"
}

resource "neon_role" "prod" {
  name       = "app_user"
  branch_id  = neon_project.main.branch.id
  project_id = neon_project.main.id
}

resource "neon_role" "dev" {
  name       = "app_user_dev"
  branch_id  = neon_project.main.branch.id
  project_id = neon_project.main.id
}

resource "neon_database" "prod" {
  name       = var.neon_database_name
  owner_name = neon_role.prod.name
  branch_id  = neon_project.main.branch.id
  project_id = neon_project.main.id
}

resource "neon_database" "dev" {
  name       = "${var.neon_database_name}-dev"
  owner_name = neon_role.dev.name
  branch_id  = neon_project.main.branch.id
  project_id = neon_project.main.id
}
