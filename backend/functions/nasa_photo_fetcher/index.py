import os
from io import BytesIO
from pathlib import Path

import boto3
import psycopg
import requests


def get_metadata_from_nasa_image_of_the_day(nasa_api_key):
    """Fetch NASA's Astronomy Picture of the Day"""
    params = {"api_key": nasa_api_key}
    response = requests.get("https://api.nasa.gov/planetary/apod", params=params)
    response.raise_for_status()
    return response.json()


def stream_image_to_s3(image_url, bucket_name, object_key, content_type="image/jpeg"):
    s3_client = boto3.client("s3")

    # Start streaming the image
    with requests.get(image_url, stream=True) as r:
        r.raise_for_status()

        # Upload the stream directly to S3
        s3_client.upload_fileobj(
            BytesIO(r.content),
            bucket_name,
            object_key,
            ExtraArgs={"ContentType": content_type},
        )

    return object_key


def handler(event, context):
    nasa_api_key = os.environ["NASA_API_KEY"]
    database_url = os.environ.get("DATABASE_URL_TEST") or os.environ["DATABASE_URL"]
    s3_bucket = os.environ["APOD_IMAGE_BUCKET_NAME"]

    try:
        # First, get today's NASA image metadata
        image_metadata = get_metadata_from_nasa_image_of_the_day(nasa_api_key)
        image_date = image_metadata["date"]
        print(f"Retrieved NASA APOD for date: {image_date}")

        # Connect to the database
        with psycopg.connect(database_url) as conn:
            # Check if we already have this image date in the database
            existing_record = conn.execute(
                "SELECT date, title, explanation, media_type, original_url, s3_object_id FROM NASA_APOD WHERE date = %s",
                (image_date,),
            ).fetchone()

            # If we already have this record, return it immediately
            if existing_record:
                print(f"Found existing NASA APOD for {image_date}, skipping processing")
                return {
                    "statusCode": 200,
                    "body": {
                        "message": "NASA image already processed",
                        "metadata": {
                            "date": existing_record[0],
                            "title": existing_record[1],
                            "explanation": existing_record[2],
                            "media_type": existing_record[3],
                            "url": existing_record[4],
                        },
                        "s3_object_id": existing_record[5],
                        "source": "database",
                    },
                }

            # Since we didn't find a record for the fetched APOD date, let's add it to the database
            # and store the APOD image in S3
            print(f"Processing new NASA APOD for {image_date}")

            # Create a simple, deterministic key based on the date
            object_key = f"nasa-apod/{image_date}.jpg"

            # Stream the image directly to S3
            s3_object_id = stream_image_to_s3(
                image_metadata["url"], s3_bucket, object_key
            )
            print(f"Streamed image to S3: {s3_object_id}")

            # Insert new NASA metadata to database
            conn.execute(
                """
                INSERT INTO NASA_APOD (
                    date, 
                    title, 
                    explanation, 
                    media_type, 
                    original_url,
                    s3_object_id
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    image_metadata["date"],
                    image_metadata["title"],
                    image_metadata["explanation"],
                    "image",  # Always assume image type
                    image_metadata["url"],
                    s3_object_id,
                ),
            )
            conn.commit()
            print(f"Inserted new record for {image_date} into database")

            return {
                "statusCode": 200,
                "body": {
                    "message": "NASA image processing complete",
                    "metadata": image_metadata,
                    "s3_object_id": s3_object_id,
                    "source": "nasa_api",
                },
            }

    except Exception as e:
        error_message = f"Error processing NASA image: {str(e)}"
        print(error_message)
        return {
            "statusCode": 500,
            "body": {"message": error_message, "status": "error"},
        }


if __name__ == "__main__":
    if not os.environ.get("AWS_SAM_LOCAL"):
        print("Running in local environment")
        # Import modules only needed for local development
        from pathlib import Path

        from dotenv import load_dotenv

        env_path = Path(__file__).parents[2] / ".env"
        load_dotenv(env_path)

        # Set AWS region for local testing
        region = os.environ.get("AWS_REGION", "us-east-1")
        boto3.setup_default_session(region_name=region)

    # Execute the handler and print its result
    result = handler(None, None)
    print(f"Status: {result['statusCode']}")
    print(f"Response: {result['body']}")
