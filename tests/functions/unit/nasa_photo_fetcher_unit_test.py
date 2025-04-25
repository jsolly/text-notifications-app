import os
import unittest
from unittest.mock import patch, MagicMock

# Add the project root to path for imports
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2]))

from backend.functions.nasa_photo_fetcher.index import (
    handler,
    get_metadata_from_nasa_image_of_the_day,
)


class TestNasaPhotoFetcher(unittest.TestCase):
    @patch(
        "backend.functions.nasa_photo_fetcher.index.get_metadata_from_nasa_image_of_the_day"
    )
    @patch("backend.functions.nasa_photo_fetcher.index.psycopg.connect")
    def test_handler_successful_execution(self, mock_connect, mock_get_metadata):
        # Setup test data
        mock_nasa_data = {
            "date": "2023-05-15",
            "title": "Test NASA Image",
            "explanation": "Test explanation for NASA image",
            "media_type": "image",
            "url": "https://example.com/image.jpg",
        }

        # Setup mock returns
        mock_get_metadata.return_value = mock_nasa_data

        # Mock connection and cursor
        mock_conn = MagicMock()
        mock_connect.return_value.__enter__.return_value = mock_conn

        # Set environment variables for the test
        with patch.dict(
            os.environ, {"NASA_API_KEY": "test_api_key", "DATABASE_URL": "test_db_url"}
        ):
            result = handler(None, None)

        # Verify the result structure
        self.assertEqual(result["statusCode"], 200)
        self.assertIn("message", result["body"])
        self.assertEqual(result["body"]["message"], "NASA image processing complete")
        self.assertIn("metadata", result["body"])
        self.assertEqual(result["body"]["metadata"], mock_nasa_data)

        # Verify the NASA API was called with the correct key
        mock_get_metadata.assert_called_once_with("test_api_key")

        # Verify database operations
        mock_conn.execute.assert_called_once()
        mock_conn.commit.assert_called_once()

    @patch(
        "backend.functions.nasa_photo_fetcher.index.get_metadata_from_nasa_image_of_the_day"
    )
    def test_handler_error_handling(self, mock_get_metadata):
        # Simulate an error in the NASA API
        mock_get_metadata.side_effect = Exception("API error")

        # Set environment variables for the test
        with patch.dict(
            os.environ, {"NASA_API_KEY": "test_api_key", "DATABASE_URL": "test_db_url"}
        ):
            result = handler(None, None)

        # Verify error response
        self.assertEqual(result["statusCode"], 500)
        self.assertIn("message", result["body"])
        self.assertIn("Error processing NASA image", result["body"]["message"])
        self.assertEqual(result["body"]["status"], "error")

    @patch("requests.get")
    def test_get_metadata_from_nasa_image_of_the_day(self, mock_get):
        # Setup mock NASA API response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "date": "2023-05-15",
            "title": "Test NASA Image",
            "explanation": "Test explanation",
            "media_type": "image",
            "url": "https://example.com/image.jpg",
        }
        mock_get.return_value = mock_response

        # Call the function
        result = get_metadata_from_nasa_image_of_the_day("test_api_key")

        # Verify API call parameters
        mock_get.assert_called_once_with(
            "https://api.nasa.gov/planetary/apod", params={"api_key": "test_api_key"}
        )

        # Verify response parsing
        self.assertEqual(result["date"], "2023-05-15")
        self.assertEqual(result["title"], "Test NASA Image")
        self.assertEqual(result["url"], "https://example.com/image.jpg")


if __name__ == "__main__":
    unittest.main()
