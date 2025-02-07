import os
import json
import boto3
import psycopg
from typing import Dict, Any
from urllib.parse import parse_qs

# Initialize AWS clients
sns = boto3.client("sns")


def parse_form_data(body: str) -> Dict[str, Any]:
    """Parse form data from request body and convert to structured data"""
    form = {k: v[0] for k, v in parse_qs(body).items()}

    return {
        "contactInfo": {
            "phone": form.get("phone", ""),
            "cityId": form.get("cityId", ""),
        },
        "preferences": {
            "language": form.get("language", "en"),
            "unit": form.get("unit", "metric"),
            "timeFormat": form.get("timeFormat", "24h"),
        },
        "notifications": {
            "daily_fullmoon": form.get("daily_fullmoon") == "on",
            "daily_nasa": form.get("daily_nasa") == "on",
            "daily_weather_outfit": form.get("daily_weather_outfit") == "on",
            "daily_recipe": form.get("daily_recipe") == "on",
            "instant_sunset": form.get("instant_sunset") == "on",
        },
    }


def save_to_postgres(data: Dict[str, Any]) -> None:
    """Save user data to PostgreSQL"""
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            # Insert user
            cur.execute(
                """
                INSERT INTO Users (
                    phone_number,
                    preferred_language,
                    notification_timezone,
                    unit_preference
                ) VALUES (%s, %s, %s, %s)
                RETURNING user_id
                """,
                (
                    data["contactInfo"]["phone"],
                    data["preferences"]["language"],
                    "America/New_York",  # Default timezone for now
                    data["preferences"]["unit"],
                ),
            )
            user_id = cur.fetchone()[0]

            # Link user to city
            cur.execute(
                """
                INSERT INTO User_Cities (user_id, city_id)
                VALUES (%s, %s)
                """,
                (user_id, data["contactInfo"]["cityId"]),
            )

            # Set notification preferences
            cur.execute(
                """
                INSERT INTO Notification_Preferences (
                    user_id,
                    daily_fullmoon,
                    daily_nasa,
                    daily_weather_outfit,
                    daily_recipe,
                    instant_sunset,
                    daily_notification_time
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    data["notifications"]["daily_fullmoon"],
                    data["notifications"]["daily_nasa"],
                    data["notifications"]["daily_weather_outfit"],
                    data["notifications"]["daily_recipe"],
                    data["notifications"]["instant_sunset"],
                    "08:00",  # Default notification time
                ),
            )

            conn.commit()


def send_welcome_notification(phone: str, language: str) -> None:
    """Send welcome notification via SNS"""
    topic_arn = os.environ.get("WELCOME_TOPIC_ARN")
    if not topic_arn:
        raise ValueError("WELCOME_TOPIC_ARN environment variable not set")

    message = {"phone": phone, "language": language}

    sns.publish(
        TopicArn=topic_arn,
        Message=json.dumps(message),
        MessageAttributes={
            "messageType": {"DataType": "String", "StringValue": "welcome"}
        },
    )


def create_html_response(status_code: int, success: bool) -> Dict[str, Any]:
    """Create HTML response for HTMX"""
    if success:
        body = """
            <div class="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <h2 class="text-2xl font-bold text-green-800 mb-3">Successfully Signed Up!</h2>
                <p class="text-green-700">You will start receiving notifications for your selected events.</p>
                <button 
                    class="mt-6 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                    onclick="window.location.reload()">
                    Sign Up Another
                </button>
            </div>
        """
    else:
        body = """
            <div class="bg-red-50 border border-red-200 rounded-xl p-8">
                <h2 class="text-2xl font-bold text-red-800 mb-3">Sign Up Failed</h2>
                <p class="text-red-700">There was an error processing your request. Please try again.</p>
                <button 
                    class="mt-6 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                    onclick="window.location.reload()">
                    Try Again
                </button>
            </div>
        """

    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "text/html"},
        "body": body,
    }


def handler(event, context):
    """Lambda handler function"""
    try:
        # Parse form data
        data = parse_form_data(event.get("body", ""))

        # Save to PostgreSQL
        save_to_postgres(data)

        # Send welcome notification
        send_welcome_notification(
            data["contactInfo"]["phone"], data["preferences"]["language"]
        )

        # Return success response
        return create_html_response(200, True)

    except Exception as e:
        print(f"Error processing signup: {str(e)}")
        return create_html_response(500, False)
