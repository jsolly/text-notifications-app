import os
import boto3
import requests
from datetime import datetime, timezone, timedelta

# Load environment variables from .env file if running locally
if __name__ == "__main__":
    from dotenv import load_dotenv
    from pathlib import Path

    env_path = Path(__file__).parents[2] / ".env"
    load_dotenv(env_path)

    # Needed for local testing
    if "AWS_REGION" in os.environ:
        boto3.setup_default_session(region_name=os.environ["AWS_REGION"])
    else:
        boto3.setup_default_session(region_name="us-east-1")

NASA_API_KEY = os.environ["NASA_API_KEY"]
METADATA_TABLE_NAME = os.environ["METADATA_TABLE_NAME"]
NASA_APOD_URL = "https://api.nasa.gov/planetary/apod"


def get_nasa_image_of_the_day():
    """Fetch NASA's Astronomy Picture of the Day"""
    params = {"api_key": NASA_API_KEY}
    response = requests.get(NASA_APOD_URL, params=params)
    response.raise_for_status()
    return response.json()


def handler(event, context):
    try:
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(METADATA_TABLE_NAME)

        image_metadata = get_nasa_image_of_the_day()

        # Prepare metadata for DynamoDB
        metadata = {
            "PK": "APOD",  # Partition key for all APOD records
            "SK": image_metadata["date"],  # Sort key using NASA's date
            "title": image_metadata["title"],
            "explanation": image_metadata["explanation"],
            "original_url": image_metadata["url"],
            "media_type": image_metadata["media_type"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expiration_time": int(
                (datetime.now(timezone.utc) + timedelta(days=30)).timestamp()
            ),
        }

        # Save metadata directly to DynamoDB
        table.put_item(Item=metadata)

        return {
            "statusCode": 200,
            "body": {
                "message": "Successfully processed NASA image of the day",
                "metadata": metadata,
            },
        }
    except Exception as e:
        print(f"Error processing NASA image: {str(e)}")
        raise


if __name__ == "__main__":
    print(handler(None, None))
