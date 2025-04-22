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
        # Fetch NASA image
        image_metadata = get_metadata_from_nasa_image_of_the_day()

        # Save to database
        with psycopg.connect(DATABASE_URL) as conn:
            # Check if record already exists
            result = conn.execute(
                "SELECT date FROM NASA_APOD WHERE date = %s", (image_metadata["date"],)
            ).fetchone()

            if result:
                # Record already exists, don't insert
                return {
                    "statusCode": 200,
                    "body": {
                        "message": "NASA image already exists in database",
                        "status": "duplicate",
                        "metadata": image_metadata,
                    },
                }

            # Insert new record
            conn.execute(
                """
                INSERT INTO NASA_APOD (
                    date, 
                    title, 
                    explanation, 
                    media_type, 
                    original_url
                ) VALUES (%s, %s, %s, %s, %s)
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
                "statusCode": 201,
                "body": {
                    "message": "Successfully added new NASA image to database",
                    "status": "created",
                    "metadata": image_metadata,
                },
            }

    except Exception as e:
        # Handle any errors
        error_message = f"Error processing NASA image: {str(e)}"
        print(error_message)
        return {
            "statusCode": 500,
            "body": {"message": error_message, "status": "error"},
        }


if __name__ == "__main__":
    print(handler(None, None))
