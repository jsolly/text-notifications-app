locals {
  environment_variables = {
    DATABASE_URL = var.environment == "prod" ? var.prod_database_url : var.dev_database_url
  }
}

# Data source to get the Git SHA
data "external" "git_info" {
  program = ["bash", "-c", "echo \"{\\\"sha\\\": \\\"$(git rev-parse --short HEAD)\\\"}\""]
}

module "signup_processor_function" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"

  function_name         = "${var.website_bucket_name}-${var.environment}-signup-processor"
  environment_variables = local.environment_variables
  image_uri             = "${aws_ecr_repository.signup_processor.repository_url}:${data.external.git_info.result.sha}"
  ecr_repository_arn    = aws_ecr_repository.signup_processor.arn
}

resource "aws_ecr_repository" "signup_processor" {
  name                 = "${var.website_bucket_name}-${var.environment}-signup-processor"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  force_delete = true
}

# Add lifecycle policy to clean up untagged images
resource "aws_ecr_lifecycle_policy" "signup_processor_policy" {
  repository = aws_ecr_repository.signup_processor.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 untagged images"
      selection = {
        tagStatus   = "untagged"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = {
        type = "expire"
      }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 SHA-tagged images"
        selection = {
          tagStatus   = "tagged"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
    }]
  })
}
