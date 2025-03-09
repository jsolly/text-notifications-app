import os
import psycopg
import requests
import boto3

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
NASA_APOD_URL = "https://api.nasa.gov/planetary/apod"
DATABASE_URL = os.environ["DATABASE_URL"]


def get_metadata_from_nasa_image_of_the_day():
    """Fetch NASA's Astronomy Picture of the Day"""
    params = {"api_key": NASA_API_KEY}
    response = requests.get(NASA_APOD_URL, params=params)
    response.raise_for_status()
    return response.json()


def handler(event, context):
    try:
        image_metadata = get_metadata_from_nasa_image_of_the_day()

        with psycopg.connect(DATABASE_URL) as conn:
            # If the APOD record already exists, do nothing
            conn.execute(
                """
                INSERT INTO NASA_APOD (
                    date, 
                    title, 
                    explanation, 
                    media_type, 
                    original_url
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (date) DO NOTHING
                """,
                (
                    image_metadata["date"],
                    image_metadata["title"],
                    image_metadata["explanation"],
                    image_metadata["media_type"],
                    image_metadata["url"],
                ),
            )
            conn.commit()

        return {
            "statusCode": 200,
            "body": {
                "message": "Successfully processed NASA image of the day",
                "metadata": image_metadata,
            },
        }
    except Exception as e:
        print(f"Error processing NASA image: {str(e)}")
        raise


if __name__ == "__main__":
    print(handler(None, None))
