output "bucket_name" {
  description = "Name of the storage bucket"
  value       = aws_s3_bucket.storage_bucket.id
}

output "bucket_arn" {
  description = "ARN of the storage bucket"
  value       = aws_s3_bucket.storage_bucket.arn
}
