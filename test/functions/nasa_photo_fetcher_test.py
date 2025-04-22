import pytest
from pathlib import Path
import sys
import os
from datetime import datetime

# Add the project root to sys.path for imports
sys.path.insert(0, str(Path(__file__).parents[2]))

from backend.functions.nasa_photo_fetcher.index import (
    handler,
    get_metadata_from_nasa_image_of_the_day,
)

# Sample response structure from NASA APOD API
SAMPLE_NASA_RESPONSE = {
    "date": datetime.now().strftime("%Y-%m-%d"),
    "explanation": "This is a test explanation of the NASA APOD image",
    "media_type": "image",
    "title": "Test Image Title",
    "url": "https://example.com/image.jpg",
}


class TestNasaPhotoFetcher:
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Setup and teardown for each test"""
        # Setup - clean the database table
        import psycopg

        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            # Delete test data from previous test runs
            conn.execute(
                "DELETE FROM NASA_APOD WHERE title = %s",
                (SAMPLE_NASA_RESPONSE["title"],),
            )
            conn.commit()

        yield

        # Teardown - clean up test data
        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            conn.execute(
                "DELETE FROM NASA_APOD WHERE title = %s",
                (SAMPLE_NASA_RESPONSE["title"],),
            )
            conn.commit()

    def test_successful_fetch_and_store(self, monkeypatch):
        """Test successful API fetch and database storage"""
        # Mock the NASA API call to return our sample data
        monkeypatch.setattr(
            "backend.functions.nasa_photo_fetcher.index.get_metadata_from_nasa_image_of_the_day",
            lambda: SAMPLE_NASA_RESPONSE,
        )

        # Run the handler
        result = handler(None, None)

        # Verify the result
        assert result["statusCode"] == 200
        assert (
            "Successfully processed NASA image of the day" in result["body"]["message"]
        )
        assert result["body"]["metadata"] == SAMPLE_NASA_RESPONSE

        # Verify the database record was created
        import psycopg

        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            records = conn.execute(
                "SELECT * FROM NASA_APOD WHERE title = %s",
                (SAMPLE_NASA_RESPONSE["title"],),
            ).fetchall()

            assert len(records) == 1
            record = records[0]
            assert record["date"].strftime("%Y-%m-%d") == SAMPLE_NASA_RESPONSE["date"]
            assert record["title"] == SAMPLE_NASA_RESPONSE["title"]
            assert record["explanation"] == SAMPLE_NASA_RESPONSE["explanation"]
            assert record["media_type"] == SAMPLE_NASA_RESPONSE["media_type"]
            assert record["original_url"] == SAMPLE_NASA_RESPONSE["url"]

    def test_duplicate_record_handling(self, monkeypatch):
        """Test handling of duplicate records"""
        # Mock the NASA API call to return our sample data
        monkeypatch.setattr(
            "backend.functions.nasa_photo_fetcher.index.get_metadata_from_nasa_image_of_the_day",
            lambda: SAMPLE_NASA_RESPONSE,
        )

        # Run the handler twice
        handler(None, None)  # First call
        result = handler(None, None)  # Second call with same data

        # Verify the result of the second call is still successful
        assert result["statusCode"] == 200

        # Verify only one database record exists
        import psycopg

        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            count = conn.execute(
                "SELECT COUNT(*) FROM NASA_APOD WHERE title = %s",
                (SAMPLE_NASA_RESPONSE["title"],),
            ).fetchone()[0]

            assert count == 1

    def test_error_handling(self, monkeypatch):
        """Test error handling when the NASA API fails"""

        # Mock the NASA API call to raise an exception
        def mock_api_error():
            raise Exception("API Error")

        monkeypatch.setattr(
            "backend.functions.nasa_photo_fetcher.index.get_metadata_from_nasa_image_of_the_day",
            mock_api_error,
        )

        # Check that the handler raises the exception
        with pytest.raises(Exception) as exc_info:
            handler(None, None)

        assert "API Error" in str(exc_info.value)
