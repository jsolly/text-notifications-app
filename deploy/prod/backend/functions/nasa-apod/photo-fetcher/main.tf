# These locals follow the naming convention of the website bucket name used in the other modules
locals {
  role_name           = "${var.website_bucket_name}-${var.environment}-nasa-photo-fetcher-role"
  s3_policy_name      = "${var.website_bucket_name}-${var.environment}-nasa-photo-fetcher-s3-access"
  trigger_rule_name   = "${var.website_bucket_name}-${var.environment}-nasa-photo-fetcher-daily-trigger"
  photo_fetcher_name  = "${var.website_bucket_name}-${var.environment}-nasa-photo-fetcher"
  metadata_table_name = "${var.website_bucket_name}-${var.environment}-metadata"
  lambda_code_bucket  = "${var.website_bucket_name}-${var.environment}-lambda-code"
  lambda_code_key     = "nasa-photo-fetcher/deployment.zip"
}

resource "aws_iam_role" "lambda_role" {
  name = local.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = local.role_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "s3_access" {
  name = local.s3_policy_name
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = ["${var.lambda_code_storage_bucket_arn}/*"]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_s3_object" "lambda_code" {
  bucket = local.lambda_code_bucket
  key    = local.lambda_code_key
}

resource "aws_lambda_function" "nasa_photo_fetcher" {
  s3_bucket        = local.lambda_code_bucket
  s3_key           = local.lambda_code_key
  source_code_hash = data.aws_s3_object.lambda_code.etag
  function_name    = local.photo_fetcher_name
  role             = aws_iam_role.lambda_role.arn
  handler          = var.function_handler
  runtime          = var.runtime
  timeout          = var.function_timeout
  memory_size      = var.function_memory_size

  environment {
    variables = {
      NASA_API_KEY = var.nasa_api_key
    }
  }

  tags = {
    Name        = local.photo_fetcher_name
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_rule" "daily_trigger" {
  name                = local.trigger_rule_name
  description         = "Triggers the NASA photo fetcher Lambda function daily at 1 AM"
  schedule_expression = "cron(0 1 * * ? *)"

  tags = {
    Name        = local.trigger_rule_name
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_trigger.name
  target_id = "TriggerNASAPhotoFetcher"
  arn       = aws_lambda_function.nasa_photo_fetcher.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.nasa_photo_fetcher.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_trigger.arn
}
