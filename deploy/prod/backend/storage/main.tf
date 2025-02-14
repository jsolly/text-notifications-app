resource "aws_s3_bucket" "storage_bucket" {
  bucket        = var.storage_bucket_name
  force_destroy = true

  tags = {
    Name        = var.storage_bucket_name
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "storage_bucket" {
  bucket = aws_s3_bucket.storage_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "storage_bucket" {
  count  = var.expiration_days != null ? 1 : 0
  bucket = aws_s3_bucket.storage_bucket.id

  rule {
    id     = "delete_old_objects"
    status = "Enabled"

    expiration {
      days = var.expiration_days
    }
  }
}
