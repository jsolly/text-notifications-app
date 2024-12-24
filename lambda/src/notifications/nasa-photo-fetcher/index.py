import os
import boto3
import requests
from datetime import datetime, timezone, timedelta


class StorageHelper:
    def __init__(self, bucket_name: str, table_name: str):
        self.s3_client = boto3.client("s3")
        self.dynamodb = boto3.resource("dynamodb")
        self.bucket_name = bucket_name
        self.table_name = table_name
        self.table = self.dynamodb.Table(table_name)

    def store_image(self, key: str, image_content: bytes):
        """Store an image in S3"""
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=image_content,
            ContentType="image/jpeg",
        )

    def save_metadata(self, metadata: dict):
        """Save metadata to DynamoDB"""
        self.table.put_item(Item=metadata)


NASA_API_KEY = os.environ["NASA_API_KEY"]
ASSET_STORAGE_BUCKET_NAME = os.environ["ASSET_STORAGE_BUCKET_NAME"]
METADATA_TABLE_NAME = os.environ["METADATA_TABLE_NAME"]
NASA_APOD_URL = "https://api.nasa.gov/planetary/apod"


def get_nasa_image_of_the_day():
    """Fetch NASA's Astronomy Picture of the Day"""
    params = {"api_key": NASA_API_KEY}
    response = requests.get(NASA_APOD_URL, params=params)
    response.raise_for_status()
    return response.json()


def download_image(url: str) -> bytes:
    """Download an image from a URL"""
    response = requests.get(url)
    response.raise_for_status()
    return response.content


def handler(event, context):
    storage_helper = StorageHelper(ASSET_STORAGE_BUCKET_NAME, METADATA_TABLE_NAME)

    try:
        # Fetch NASA image metadata
        image_data = get_nasa_image_of_the_day()

        # Download the image
        image_url = image_data["hdurl"] if "hdurl" in image_data else image_data["url"]
        image_content = download_image(image_url)

        # Generate S3 key using NASA's date (which is in YYYY-MM-DD format)
        filename = f"nasa_apod_{image_data['date']}.jpg"
        s3_key = f"nasa_images/{filename}"

        # Store image in S3
        storage_helper.store_image(s3_key, image_content)

        # Prepare metadata for DynamoDB
        metadata = {
            "PK": "APOD",  # Partition key for all APOD records
            "SK": image_data["date"],  # Sort key using NASA's date
            "title": image_data["title"],
            "explanation": image_data["explanation"],
            "original_url": image_url,
            "s3_key": s3_key,
            "media_type": image_data["media_type"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expiration_time": int(
                (datetime.now(timezone.utc) + timedelta(days=30)).timestamp()
            ),
        }

        # Save metadata to DynamoDB
        storage_helper.save_metadata(metadata)

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
