output "lambda_function_arn" {
  value = aws_lambda_function.nasa_photo_sender.arn
}

output "lambda_function_name" {
  value = aws_lambda_function.nasa_photo_sender.function_name
}

output "s3_raw_hash" {
  description = "The raw ETag from S3 object"
  value       = data.aws_s3_object.lambda_code.etag
} 
