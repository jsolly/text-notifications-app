terraform {
  required_providers {
    neon = {
      source  = "terraform-community-providers/neon"
      version = "~> 0.1.0"
    }
  }
}

provider "neon" {
  token = var.neon_api_key
}

resource "neon_project" "text_notifications" {
  name      = "text-notifications"
  region_id = "aws-us-east-1"
}

resource "neon_role" "app_role" {
  name       = "app_user"
  branch_id  = neon_project.text_notifications.branch.id
  project_id = neon_project.text_notifications.id
}

resource "neon_database" "notifications_db" {
  name       = "text_notifications_db"
  owner_name = neon_role.app_role.name
  branch_id  = neon_project.text_notifications.branch.id
  project_id = neon_project.text_notifications.id
}
