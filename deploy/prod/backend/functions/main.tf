locals {
  environment_variables = {
    DATABASE_URL = var.environment == "prod" ? var.prod_database_url : var.dev_database_url
  }
}

module "signup_processor_function" {
  source = "git::ssh://git@github.com/jsolly/infra_as_code.git//functions"

  function_name         = "${var.website_bucket_name}-${var.environment}-signup-processor"
  lambda_code_bucket    = var.lambda_code_bucket
  lambda_code_key       = "signup-processor/deployment.zip"
  runtime               = "nodejs22.x"
  environment_variables = local.environment_variables
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
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "untagged"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}
