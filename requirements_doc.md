# Signup Notifications Processor - Project Requirements Document

## Overview

The Signup Notifications Processor is a serverless function that handles user signup requests by:

- Parsing form submissions with contact information, user preferences, and notification settings.
- Validating input data (e.g., phone number format).
- Persisting user data and their associated city and notification preferences in a PostgreSQL database.
- Sending a welcome notification via AWS SNS.
- Returning an HTML response that communicates the success or failure of the signup process.

## Functional Requirements

1. **Form Data Parsing**
   - Parse incoming form submissions (URL-encoded body) to extract:
     - Contact information (phone number, city ID)
     - User preferences (language, measurement unit, time format)
     - Notification options (instant notifications for weather and traffic alerts; daily notifications for weather forecast and traffic report)

2. **Phone Number Validation**
   - Ensure the phone number matches a predefined regex pattern.
   - Verify the phone number length is between 9 and 16 characters.

3. **Data Persistence**
   - **Users Table**: Insert the user record including phone number, language preference, default notification timezone, and unit preference.
   - **User_Cities Table**: Create an association between the user and the selected city.
   - **Notification_Preferences Table**: Insert the user's notification settings with a default daily notification time.

4. **Welcome Notification**
   - Publish a welcome message to an SNS topic using the provided environment variable `WELCOME_TOPIC_ARN`.
   - The message should include the user's phone number and language.

5. **HTML Response Generation**
   - Return a success HTML response confirming signup on valid operation.
   - Return an error HTML response if any exception or validation error occurs.

6. **Error Handling**
   - Log errors with sufficient details for diagnostics.
   - Respond with a 500 status code and a user-friendly error message on failure.

## Non-Functional Requirements

- **Performance:** The Lambda function should process requests promptly.
- **Scalability:** The architecture must be capable of handling increased loads.
- **Security:**
  - Environment variables (e.g., `DATABASE_URL`, `WELCOME_TOPIC_ARN`) must be securely managed.
  - Validate and sanitize all user inputs.
- **Reliability:** Ensure that in case of failure (e.g., in database or SNS operations), errors are logged appropriately and a fallback response is returned.
- **Local Testing:** Provide support for local testing using:
  - AWS SAM CLI
  - Serverless Framework with the offline plugin
  - A minimal web server (e.g., using Flask) to simulate API Gateway requests

## Environment Specifications

- **Runtime:** AWS Lambda (Python 3.12)
- **Database:** PostgreSQL (accessed via psycopg)
- **Notification Service:** AWS SNS

### Required Environment Variables

- `DATABASE_URL`: Connection string for PostgreSQL.
- `WELCOME_TOPIC_ARN`: ARN for the AWS SNS topic to publish welcome notifications.

## Tools & Technologies

- Python 3.12
- AWS Lambda, API Gateway, AWS SNS
- PostgreSQL with psycopg
- AWS SAM CLI or Serverless Framework for local testing and deployment
- Flask (optional) for local development/testing purposes

## Testing Strategy

- **Unit Testing:** Validate individual functions such as form parsing, phone validation, and HTML response generation using testing frameworks like `pytest` or Python's built-in `unittest`.
- **Integration Testing:** 
  - Validate interactions with the PostgreSQL database (using a test database or mocks).
  - Confirm that SNS notifications are published correctly (using mocks or AWS SNS test topics).
- **End-to-End Testing:** 
  - Use AWS SAM CLI or Serverless Offline to simulate API Gateway events and test the entire workflow.
  - Create simple HTML forms to simulate UI submissions.

## Deployment Considerations

- Use CI/CD pipelines to manage testing and deployment.
- Secure and manage environment variables carefully during deployment.
- Monitor logs (e.g., via CloudWatch) for error tracking and diagnostics in production.

## Future Enhancements

- Support configurable time zones based on user preferences.
- Enhance validation and error messaging for form inputs.
- Integrate advanced logging/monitoring solutions.
- Expand test coverage to include more edge cases and load testing.

## Assumptions

- The city information (city ID) is validated/exists within the system.
- Default values (e.g., notification time, timezone) are acceptable until further customization.
- External calls to PostgreSQL and SNS are reliable and appropriately managed.

---

This document serves as the initial requirements outline to implement and test the signup notifications functionality. 