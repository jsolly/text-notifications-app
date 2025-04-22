import os
import psycopg
import requests
import boto3


def is_running_in_lambda():
    """
    Detect if the code is running in AWS Lambda environment.
    AWS Lambda sets AWS_LAMBDA_FUNCTION_NAME in all runtime environments,
    including custom runtimes.
    """
    return os.environ.get("AWS_LAMBDA_FUNCTION_NAME") is not None


def get_metadata_from_nasa_image_of_the_day(nasa_api_key):
    """Fetch NASA's Astronomy Picture of the Day"""
    params = {"api_key": nasa_api_key}
    response = requests.get("https://api.nasa.gov/planetary/apod", params=params)
    response.raise_for_status()
    return response.json()


def handler(event, context):
    # Get environment variables
    nasa_api_key = os.environ["NASA_API_KEY"]
    database_url = os.environ["DATABASE_URL"]

    try:
        # Fetch NASA image from their API
        image_metadata = get_metadata_from_nasa_image_of_the_day(nasa_api_key)

        # Save NASA metadata to database
        # If there is already a record for the date, do nothing
        with psycopg.connect(database_url) as conn:
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
                    "message": "NASA image processing complete",
                    "metadata": image_metadata,
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
    if not is_running_in_lambda():
        print("Running in local environment")
        # Import modules only needed for local development
        from dotenv import load_dotenv
        from pathlib import Path

        env_path = Path(__file__).parents[2] / ".env"
        load_dotenv(env_path)

        # Set AWS region for local testing
        region = os.environ.get("AWS_REGION", "us-east-1")
        boto3.setup_default_session(region_name=region)

    # Execute the handler and print its result
    result = handler(None, None)
    print(f"Status: {result['statusCode']}")
    print(f"Response: {result['body']}")
