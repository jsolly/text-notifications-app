import os

import psycopg
from twilio.rest import Client

# Load environment variables from .env file if running locally
if __name__ == "__main__":
    from pathlib import Path

    from dotenv import load_dotenv

    env_path = Path(__file__).parents[2] / ".env"
    load_dotenv(env_path)

TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]
TWILIO_SENDER_PHONE_NUMBER = os.environ["TWILIO_SENDER_PHONE_NUMBER"]
TWILIO_TARGET_PHONE_NUMBER = os.environ["TWILIO_TARGET_PHONE_NUMBER"]

NASA_API_KEY = os.environ["NASA_API_KEY"]
NASA_APOD_URL = "https://api.nasa.gov/planetary/apod"
DATABASE_URL = os.environ["DATABASE_URL"]


class TwilioHelper:
    def __init__(
        self, account_sid: str, auth_token: str, from_number: str, to_number: str
    ):
        self.client = Client(account_sid, auth_token)
        self.from_number = from_number
        self.to_number = to_number

    def send_message(self, photo_url: str, description: str) -> str:
        """Send a message with photo using Twilio.

        Note: MMS is only supported in US and Canada
        """
        try:
            message = self.client.messages.create(
                body=f"NASA's Astronomy Picture of the Day!\n\n{description}",
                from_=self.from_number,
                media_url=[photo_url],
                to=self.to_number,
            )

            # Log message status for debugging
            print(f"Message SID: {message.sid}")
            print(f"Message status: {message.status}")

            return message.sid

        except Exception as e:
            print(f"Failed to send message: {str(e)}")
            raise


def get_today_nasa_apod_data():
    """Get today's NASA APOD photo data from PostgreSQL"""
    with psycopg.connect(DATABASE_URL) as conn:
        result = conn.execute("""
            SELECT title, explanation, original_url, media_type 
            FROM NASA_APOD 
            WHERE date = CURRENT_DATE
        """).fetchone()

        if not result:
            raise Exception("No NASA APOD data found for today")

        return {
            "title": result["title"],
            "explanation": result["explanation"],
            "url": result["original_url"],
            "media_type": result["media_type"],
        }


def handler(event, context):
    try:
        twilio_helper = TwilioHelper(
            TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN,
            TWILIO_SENDER_PHONE_NUMBER,
            TWILIO_TARGET_PHONE_NUMBER,
        )

        # Get the latest NASA photo data
        photo_data = get_today_nasa_apod_data()

        # Send the photo via Twilio using the protected function
        message_sid = twilio_helper.send_message(
            photo_data["url"], photo_data["explanation"]
        )

        return {
            "statusCode": 200,
            "body": {
                "message": "Successfully sent NASA photo",
                "message_sid": message_sid,
                "photo_url": photo_data["url"],
            },
        }

    except Exception as e:
        print(f"Error sending NASA photo: {str(e)}")
        raise


if __name__ == "__main__":
    print(handler(None, None))
