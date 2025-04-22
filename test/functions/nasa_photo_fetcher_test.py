import sys
from pathlib import Path
import os

import psycopg
import pytest
from psycopg.rows import dict_row

# Add the project root to sys.path for imports
sys.path.insert(0, str(Path(__file__).parents[2]))

from backend.functions.nasa_photo_fetcher.index import handler

DATABASE_URL = os.environ["DATABASE_URL"]


class TestNasaPhotoFetcher:
    @pytest.fixture(autouse=True, scope="class")
    def setup_database(self):
        """Setup clean database state before running tests"""
        with psycopg.connect(DATABASE_URL) as conn:
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

        # Verify the metadata is valid
        assert "date" in image_metadata
        assert "title" in image_metadata
        assert "explanation" in image_metadata
        assert "media_type" in image_metadata
        assert "url" in image_metadata

        # Verify the database record was created
        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
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

    def test_duplicate_record_handling(self):
        """Test handling of duplicate records with actual API calls"""
        # Run the handler twice
        handler(None, None)  # First call
        result = handler(None, None)  # Second call with same data

        # Verify the result of the second call is still successful
        assert result["statusCode"] == 200

        # Verify only one database record exists for today
        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
            count_result = conn.execute(
                "SELECT COUNT(*) as count FROM NASA_APOD WHERE date = CURRENT_DATE"
            ).fetchone()
            count = count_result["count"]

            assert count == 1
