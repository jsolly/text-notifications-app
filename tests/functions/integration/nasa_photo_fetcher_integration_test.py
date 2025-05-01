import sys
from pathlib import Path
import os

import psycopg
import pytest
import boto3
from psycopg.rows import dict_row

# Add the project root to sys.path for imports
sys.path.insert(0, str(Path(__file__).parents[3]))

from backend.functions.nasa_photo_fetcher.index import handler

DATABASE_URL_TEST = os.environ["DATABASE_URL_TEST"]


@pytest.mark.integration
class TestNasaPhotoFetcher:
    @pytest.fixture(autouse=True, scope="class")
    def setup_database(self):
        """Setup clean database state before running tests"""
        with psycopg.connect(DATABASE_URL_TEST) as conn:
            conn.execute("DELETE FROM NASA_APOD")
            conn.commit()

    def test_successful_fetch_and_store(self):
        """Test successful API fetch and database storage - actual integration test"""
        # Run the handler to fetch from real NASA API and store in the DB
        result = handler(None, None)

        # Verify the result
        assert result["statusCode"] == 200
        assert "NASA image processing complete" in result["body"]["message"]

        # Extract metadata from the response
        image_metadata = result["body"]["metadata"]
        s3_object_id = result["body"]["s3_object_id"]

        # Verify the metadata is valid
        assert "date" in image_metadata
        assert "title" in image_metadata
        assert "explanation" in image_metadata
        assert "media_type" in image_metadata
        assert "url" in image_metadata

        # Verify the S3 object ID is valid
        assert s3_object_id
        assert s3_object_id.startswith("nasa-apod/")
        assert s3_object_id.endswith(".jpg")

        # Verify the S3 object exists
        s3_client = boto3.client("s3")
        bucket_name = os.environ["APOD_IMAGE_BUCKET_NAME"]

        try:
            s3_response = s3_client.head_object(Bucket=bucket_name, Key=s3_object_id)
            assert s3_response["ContentType"] == "image/jpeg"
            assert s3_response["ContentLength"] > 0
        except Exception as e:
            pytest.fail(f"S3 object verification failed: {str(e)}")

        # Verify the database record was created
        with psycopg.connect(DATABASE_URL_TEST, row_factory=dict_row) as conn:
            records = conn.execute(
                "SELECT * FROM NASA_APOD WHERE date = CURRENT_DATE"
            ).fetchall()

            assert len(records) == 1
            record = records[0]

            # Verify the database record matches the API response
            assert record["date"].strftime("%Y-%m-%d") == image_metadata["date"]
            assert record["title"] == image_metadata["title"]
            assert record["explanation"] == image_metadata["explanation"]
            assert record["media_type"] == image_metadata["media_type"]
            assert record["original_url"] == image_metadata["url"]

            # Verify the S3 object ID in the database matches the one returned in the API response
            assert record["s3_object_id"] == s3_object_id

    def test_duplicate_record_handling(self):
        """Test handling of duplicate records with actual API calls"""
        # Run the handler twice
        handler(None, None)  # First call
        result = handler(None, None)  # Second call with same data

        # Verify the result of the second call is still successful
        assert result["statusCode"] == 200

        # Verify only one database record exists for today
        with psycopg.connect(DATABASE_URL_TEST, row_factory=dict_row) as conn:
            count_result = conn.execute(
                "SELECT COUNT(*) as count FROM NASA_APOD WHERE date = CURRENT_DATE"
            ).fetchone()
            count = count_result["count"]

            assert count == 1
