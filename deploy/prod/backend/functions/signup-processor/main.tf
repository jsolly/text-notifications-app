locals {
  role_name            = "${var.website_bucket_name}-${var.environment}-signup-processor-role"
  lambda_function_name = "${var.website_bucket_name}-${var.environment}-signup-processor"
  lambda_code_bucket   = "${var.website_bucket_name}-${var.environment}-lambda-code"
  lambda_code_key      = "signup-processor/deployment.zip"
  database_url         = var.environment == "prod" ? var.prod_database_url : var.dev_database_url
}

resource "aws_lambda_function" "signup_processor" {
  filename      = "${path.module}/../dummy.zip"
  function_name = local.lambda_function_name
  role          = aws_iam_role.lambda_exec.arn
  handler       = var.function_handler
  runtime       = var.runtime
  timeout       = var.function_timeout
  memory_size   = var.function_memory_size

  environment {
    variables = {
      DATABASE_URL = local.database_url
    }
  }

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      s3_bucket,
      s3_key
    ]
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "signup_processor_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
