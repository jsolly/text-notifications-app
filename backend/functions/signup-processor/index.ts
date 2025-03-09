import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import type pg from "pg";
import {
	getDbClient,
	generateInsertStatement,
	executeTransaction,
	closeDbClient,
} from "../shared/db";
import type {
	SignupFormData,
	Notification,
	ContactInfo,
	Preferences,
} from "@text-notifications/shared";
import {
	NOTIFICATION_SCHEMA,
	CONTACT_SCHEMA,
	PREFERENCES_SCHEMA,
} from "@text-notifications/shared";
import {
	parseSchemaFields,
	parseNotificationPreferences,
} from "@text-notifications/shared";

const HTML_HEADERS = {
	"Content-Type": "text/html",
};

/**
 * Inserts signup data into the database
 * @param client The database client
 * @param data The signup data to insert
 */
const insertSignupData = async (
	client: pg.Client,
	data: SignupFormData,
): Promise<void> => {
	try {
		await executeTransaction(client, async () => {
			// Insert user data
			const userData = {
				preferred_name: data.contact_info.preferred_name,
				phone_number: data.contact_info.phone_number,
				phone_country_code: data.contact_info.phone_country_code,
				city_id: data.contact_info.city_id,
				preferred_language: data.preferences.preferred_language,
				unit_preference: data.preferences.unit_preference,
				time_format: data.preferences.time_format,
				daily_notification_time: data.preferences.daily_notification_time,
			};

			const { sql: userSql, params: userParams } = generateInsertStatement(
				"users",
				userData,
			);

			// Use raw SQL query
			const userResult = await client.query(userSql, userParams);
			const userId = userResult.rows[0].user_id;

			// user_id is a foreign key in the notification_preferences table to the users table
			const notificationData = {
				user_id: userId,
				...data.notifications,
			};

			const fields = Object.keys(notificationData);
			const placeholders = fields.map((_, index) => `$${index + 1}`).join(", ");
			const values = fields.map(
				(field) => notificationData[field as keyof typeof notificationData],
			);

			const manualSql = `INSERT INTO notification_preferences (${fields.join(", ")})
							 VALUES (${placeholders}) 
							 RETURNING *`;

			await client.query(manualSql, values);
		});
	} catch (error) {
		if (error instanceof Error) {
			// Check for unique constraint violation on phone number
			if (
				error.message.includes("unique constraint") &&
				error.message.includes("phone_number")
			) {
				throw new Error("A user with that phone number already exists.");
			}
		}

		console.error("Database error during signup:", error);
		throw new Error("Failed to save your information. Please try again later.");
	}
};

const parseFormData = (formData: URLSearchParams): SignupFormData => {
	// Parse contact info using the schema
	const contactInfo = parseSchemaFields<ContactInfo>(formData, CONTACT_SCHEMA);

	// Parse preferences using the schema
	const preferences = parseSchemaFields<Preferences>(
		formData,
		PREFERENCES_SCHEMA,
	);

	// Parse notifications using the schema
	const notifications = parseNotificationPreferences<Notification>(
		formData,
		NOTIFICATION_SCHEMA,
	);

	const signupData: SignupFormData = {
		contact_info: contactInfo,
		preferences,
		notifications,
	};

	return signupData;
};

interface TurnstileResponse {
	success: boolean;
	"error-codes"?: string[];
}

/**
 * Verifies the Cloudflare Turnstile token with their API
 */
const verifyTurnstileToken = async (
	token: string,
	remoteIp?: string,
): Promise<{ success: boolean; errors: string[] }> => {
	// Skip verification in development mode
	if (process.env.NODE_ENV === "development") {
		return { success: true, errors: [] };
	}

	const verificationUrl =
		"https://challenges.cloudflare.com/turnstile/v0/siteverify";
	const secretKey = process.env.TURNSTILE_SECRET_KEY;

	if (!secretKey) {
		throw new Error("Turnstile secret key is not configured");
	}

	// Create form data for verification request
	const formData = new FormData();
	formData.append("secret", secretKey);
	formData.append("response", token);
	if (remoteIp) {
		formData.append("remoteip", remoteIp);
	}

	// Add this if you need to retry verification requests
	const idempotencyKey = crypto.randomUUID();
	formData.append("idempotency_key", idempotencyKey);

	const response = await fetch(verificationUrl, {
		method: "POST",
		body: formData,
	});

	const result = (await response.json()) as TurnstileResponse;

	return {
		success: result.success === true,
		errors: result["error-codes"] || [],
	};
};

/**
 * Processes the sign-up form submission and stores user preferences
 * Note: This function is async to support future database operations and SMS service integration
 */
export const handler = async (
	event: APIGatewayProxyEvent,
	_context: Context,
): Promise<APIGatewayProxyResult> => {
	let client: pg.Client | null = null;
	try {
		if (!event.body) {
			throw new Error("No form data received in request body");
		}

		// Handle both base64 and non-base64 encoded bodies
		const decodedBody = event.isBase64Encoded
			? Buffer.from(event.body, "base64").toString()
			: event.body;

		// Parse the JSON body if it's a string
		let formDataStr = decodedBody;
		try {
			const jsonBody = JSON.parse(decodedBody);
			if (typeof jsonBody.body === "string") {
				formDataStr = jsonBody.body;
			}
		} catch (e) {
			// If parsing fails, use the original body
			formDataStr = decodedBody;
		}

		const formData = new URLSearchParams(formDataStr);

		// Skip Turnstile verification in development mode
		if (process.env.NODE_ENV !== "development") {
			// Extract and verify Turnstile token from headers or form data
			const turnstileToken =
				event.headers["cf-turnstile-response"] ||
				formData.get("cf-turnstile-response");

			if (!turnstileToken) {
				throw new Error("Missing Turnstile verification token");
			}

			// Get the client IP from various possible headers
			const clientIp =
				event.requestContext.identity?.sourceIp ||
				event.headers["x-forwarded-for"]?.split(",")[0];

			const verification = await verifyTurnstileToken(turnstileToken, clientIp);
			if (!verification.success) {
				// Log the actual error codes for debugging
				console.error("Turnstile verification failed:", verification.errors);

				// Provide a user-friendly error message
				throw new Error("Security verification failed. Please try again.");
			}
		}

		// Parse form data into structured user data
		const userData = parseFormData(formData);

		// Get database client and insert data
		try {
			client = await getDbClient();
			await insertSignupData(client, userData);

			// Return success response
			return {
				statusCode: 200,
				headers: HTML_HEADERS,
				body: `
					<!DOCTYPE html>
					<html>
						<head>
							<title>Signup Successful</title>
							<meta charset="utf-8">
							<meta name="viewport" content="width=device-width, initial-scale=1">
							<style>
								body {
									font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
									line-height: 1.6;
									margin: 0;
									padding: 20px;
									background-color: #f5f5f5;
								}
								.container {
									max-width: 600px;
									margin: 0 auto;
									background-color: white;
									padding: 30px;
									border-radius: 8px;
									box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
								}
								h1 {
									color: #2c3e50;
									margin-top: 0;
								}
								p {
									color: #34495e;
									margin-bottom: 20px;
								}
								.success-message {
									background-color: #d4edda;
									color: #155724;
									padding: 15px;
									border-radius: 4px;
									margin-bottom: 20px;
								}
								.error-message {
									background-color: #f8d7da;
									color: #721c24;
									padding: 15px;
									border-radius: 4px;
									margin-bottom: 20px;
								}
							</style>
						</head>
						<body>
							<div class="container">
								<h1>Signup Successful!</h1>
								<div class="success-message">
									<p>Thank you for signing up! You will start receiving notifications soon.</p>
								</div>
								<p>If you have any questions, please don't hesitate to contact us.</p>
							</div>
						</body>
					</html>
				`,
			};
		} catch (error) {
			console.error("Error processing signup:", error);
			throw error;
		}
	} catch (error) {
		console.error("Error in signup handler:", error);

		// Create a user-friendly error message
		let userFriendlyMessage =
			"An unexpected error occurred. Please try again later.";

		// Only use specific error messages that we've explicitly created
		if (error instanceof Error) {
			// List of known user-friendly error messages
			const knownErrorMessages = [
				"A user with that phone number already exists.",
				"No form data received in request body",
				"Missing Turnstile verification token",
				"Security verification failed. Please try again.",
				"Failed to save your information. Please try again later.",
			];

			// Check if the error message is one we explicitly created
			const isKnownError = knownErrorMessages.some((msg) =>
				error.message.includes(msg),
			);
			if (isKnownError) {
				userFriendlyMessage = error.message;
			}
		}

		// Return error response
		return {
			statusCode: 400,
			headers: HTML_HEADERS,
			body: `
				<!DOCTYPE html>
				<html>
					<head>
						<title>Signup Failed</title>
						<meta charset="utf-8">
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<style>
							body {
								font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
								line-height: 1.6;
								margin: 0;
								padding: 20px;
								background-color: #f5f5f5;
							}
							.container {
								max-width: 600px;
								margin: 0 auto;
								background-color: white;
								padding: 30px;
								border-radius: 8px;
								box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
							}
							h1 {
								color: #2c3e50;
								margin-top: 0;
							}
							p {
								color: #34495e;
								margin-bottom: 20px;
							}
							.success-message {
								background-color: #d4edda;
								color: #155724;
								padding: 15px;
								border-radius: 4px;
								margin-bottom: 20px;
							}
							.error-message {
								background-color: #f8d7da;
								color: #721c24;
								padding: 15px;
								border-radius: 4px;
								margin-bottom: 20px;
							}
						</style>
					</head>
					<body>
						<div class="container">
							<h1>Signup Failed</h1>
							<div class="error-message">
								<p>${userFriendlyMessage}</p>
							</div>
							<p>Please try again or contact support if the problem persists.</p>
						</div>
					</body>
				</html>
			`,
		};
	} finally {
		// Close the client if it was created
		if (client) {
			await closeDbClient(client);
		}
	}
};

// Add a default export for better ESM compatibility with AWS Lambda
export default { handler };
