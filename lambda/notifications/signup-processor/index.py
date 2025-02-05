import os
import json
import boto3
from typing import Dict, Any
from urllib.parse import parse_qs
import re
from datetime import datetime

# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns")


def parse_form_data(body: str) -> Dict[str, Any]:
    """Parse form data from request body and convert to structured data"""
    # Parse form data
    form_data = parse_qs(body)

    # Helper to get single value from form data
    def get_value(key: str, default: str = "") -> str:
        values = form_data.get(key, [default])
        return values[0] if values else default

    # Helper to check if checkbox is checked
    def is_checked(key: str) -> bool:
        return get_value(key) == "on"

    return {
        "contactInfo": {"phone": get_value("phone"), "cityId": get_value("cityId")},
        "preferences": {
            "language": get_value("language", "en"),
            "unit": get_value("unit", "metric"),
            "timeFormat": get_value("timeFormat", "24h"),
        },
        "notifications": {
            "instant": {
                "weatherAlerts": is_checked("weatherAlerts"),
                "trafficAlerts": is_checked("trafficAlerts"),
            },
            "daily": {
                "weatherForecast": is_checked("weatherForecast"),
                "trafficReport": is_checked("trafficReport"),
            },
        },
    }


def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    pattern = r"^\+?[\d\s-()]{10,}$"
    return bool(re.match(pattern, phone))


def save_to_dynamodb(data: Dict[str, Any]) -> None:
    """Save user data to DynamoDB"""
    table = dynamodb.Table(os.environ.get("USERS_TABLE_NAME", "Users"))

    item = {
        "phone": data["contactInfo"]["phone"],
        "cityId": data["contactInfo"]["cityId"],
        "preferences": data["preferences"],
        "notifications": data["notifications"],
        "createdAt": datetime.now().isoformat(),
    }

    table.put_item(Item=item)


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

        # Validate phone number
        if not validate_phone(data["contactInfo"]["phone"]):
            raise ValueError("Invalid phone number format")

        # Save to DynamoDB
        save_to_dynamodb(data)

        # Send welcome notification
        send_welcome_notification(
            data["contactInfo"]["phone"], data["preferences"]["language"]
        )

        # Return success response
        return create_html_response(200, True)

    except Exception as e:
        print(f"Error processing signup: {str(e)}")
        return create_html_response(500, False)
