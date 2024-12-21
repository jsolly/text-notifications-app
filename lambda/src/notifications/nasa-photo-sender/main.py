import os
import boto3
import requests
from twilio.rest import Client
from datetime import datetime, timezone


class TwilioHelper:
    def __init__(
        self, account_sid: str, auth_token: str, from_number: str, to_number: str
    ):
        self.client = Client(account_sid, auth_token)
        self.from_number = from_number
        self.to_number = to_number

    def send_message(self, photo_url: str, description: str) -> str:
        """Send a message with photo using Twilio"""
        message = self.client.messages.create(
            body=f"NASA's Astronomy Picture of the Day!\n\n{description}",
            from_=self.from_number,
            media_url=[photo_url],
            to=self.to_number,
        )
        return message.sid


# Environment variables
TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]
TWILIO_PHONE_NUMBER = os.environ["TWILIO_PHONE_NUMBER"]
TARGET_PHONE_NUMBER = os.environ["TARGET_PHONE_NUMBER"]
TABLE_NAME = os.environ["METADATA_TABLE_NAME"]


def get_latest_nasa_photo():
    """Get the latest NASA photo from DynamoDB"""
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(TABLE_NAME)

    # Get the latest photo by scanning the table and sorting by date
    response = table.scan()
    items = response["Items"]
    if not items:
        raise Exception("No NASA photos found in database")

    # Sort by date and get the most recent
    latest_photo = sorted(items, key=lambda x: x["date"], reverse=True)[0]
    return latest_photo


def handler(event, context):
    try:
        # Initialize Twilio helper
        twilio_helper = TwilioHelper(
            TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN,
            TWILIO_PHONE_NUMBER,
            TARGET_PHONE_NUMBER,
        )

        # Get the latest NASA photo data
        photo_data = get_latest_nasa_photo()

        # Get the S3 URL for the photo
        s3_client = boto3.client("s3")
        bucket_name = os.environ["STORAGE_BUCKET_NAME"]
        s3_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": photo_data["s3_key"]},
            ExpiresIn=3600,
        )

        # Send the photo via Twilio
        message_sid = twilio_helper.send_message(s3_url, photo_data["explanation"])

        return {
            "statusCode": 200,
            "body": {
                "message": "Successfully sent NASA photo",
                "message_sid": message_sid,
                "photo_id": photo_data["id"],
            },
        }

    except Exception as e:
        print(f"Error sending NASA photo: {str(e)}")
        raise


if __name__ == "__main__":
    handler(None, None)
