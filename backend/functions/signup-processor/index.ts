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
} from "../shared/db.js";
import type {
	SignupFormData,
	NotificationField,
	ContactField,
	PreferenceField,
} from "@text-notifications/shared";
import {
	NOTIFICATION_SCHEMA,
	CONTACT_SCHEMA,
	PREFERENCES_SCHEMA,
	USER_FIELDS,
} from "@text-notifications/shared";
import {
	parseSchemaFields,
	parseNotificationPreferences,
} from "@text-notifications/shared";

const HTML_HEADERS = {
	"Content-Type": "text/html",
	"HX-Trigger": "signupResponse",
};

/**
 * Generate success response HTML
 */
const getSuccessHtml = () => `
<button type="button" 
  id="submit_button"
  class="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium shadow-md"
  data-success="true"
  disabled>
  Sign Up Successful!
</button>
`;

/**
 * Generate error response HTML
 * @param errorMessage The error message to display to the user
 */
const getErrorHtml = (errorMessage: string) => `
<button type="submit" 
  id="submit_button"
  class="w-full bg-red-600 text-white cursor-not-allowed py-3 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors font-medium shadow-md"
  data-error="true"
  disabled>
  ${errorMessage}
</button>
`;

/**
 * Inserts signup data into the database
 * @param client The database client
 * @param data The signup data to insert
 */
const insertSignupData = async (
	client: pg.PoolClient,
	data: SignupFormData,
): Promise<void> => {
	try {
		await executeTransaction(client, async () => {
			const userData = (USER_FIELDS as readonly string[]).reduce<
				Record<string, string>
			>((acc, field) => {
				if (field in data.contact_info) {
					acc[field] = (data.contact_info as Record<string, string>)[field];
				} else if (field in data.preferences) {
					acc[field] = (data.preferences as Record<string, string>)[field];
				}
				return acc;
			}, {});

			const { sql: userSql, params: userParams } = generateInsertStatement(
				"users",
				userData,
			);

			// Use raw SQL query
			const userResult = await client.query<{ id: string }>(
				userSql,
				userParams,
			);
			const userId = userResult.rows[0].id;

			// user_id is a foreign key in the notification_preferences table to the users table
			const notificationData = {
				user_id: userId,
				...data.notifications,
			};

			const fields = Object.keys(notificationData);
			const placeholders = fields.map((_, index) => `$${index + 1}`).join(", ");
			const values = fields.map(
				(field) => (notificationData as Record<string, unknown>)[field],
			);

			const manualSql = `INSERT INTO notification_preferences (${fields.join(", ")})
							 VALUES (${placeholders}) 
							 RETURNING *`;

			await client.query(manualSql, values);
		});
	} catch (error) {
		// Log the user data that caused the error (excluding sensitive info)
		const sanitizedData = {
			contact_info: {
				...data.contact_info,
				phone_number: data.contact_info.phone_number ? "REDACTED" : null,
			},
			preferences: data.preferences,
			notifications: data.notifications,
		};

		console.error("Database error during signup:", error, {
			userData: sanitizedData,
		});

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
	const contactInfo = parseSchemaFields<ContactField>(formData, CONTACT_SCHEMA);

	// Parse preferences using the schema
	const preferences = parseSchemaFields<PreferenceField>(
		formData,
		PREFERENCES_SCHEMA,
	);

	// Parse notifications using the schema
	const notifications = parseNotificationPreferences<NotificationField>(
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
	const verificationUrl =
		"https://challenges.cloudflare.com/turnstile/v0/siteverify";
	const secretKey = process.env.TURNSTILE_SECRET_KEY;

	if (!secretKey) {
		throw new Error("Turnstile secret key is not configured");
	}

	// Create URL search params for verification request
	const params = new URLSearchParams();
	params.append("secret", secretKey);
	params.append("response", token);
	if (remoteIp) {
		params.append("remoteip", remoteIp);
	}

	// Send verification request to Cloudflare
	try {
		const response = await fetch(verificationUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params,
		});

		if (!response.ok) {
			throw new Error(
				`Turnstile verification failed with status: ${response.status}`,
			);
		}

		const result = (await response.json()) as TurnstileResponse;
		return {
			success: result.success,
			errors: result["error-codes"] || [],
		};
	} catch (error) {
		console.error("Error verifying Turnstile token:", error);
		return { success: false, errors: ["verification-request-failed"] };
	}
};

/**
 * Processes the sign-up form submission and stores user preferences
 * Note: This function is async to support future database operations and SMS service integration
 */
export const handler = async (
	event: APIGatewayProxyEvent,
	_context: Context,
): Promise<APIGatewayProxyResult> => {
	let client: pg.PoolClient | null = null;
	let parsedFormData: SignupFormData | null = null;

	// Create a request context object for logging
	const requestContext = {
		requestId: event.requestContext.requestId,
		userAgent: event.headers?.user_agent,
		sourceIp: event.requestContext.identity?.sourceIp,
		referer: event.headers?.referer,
		path: event.path,
		httpMethod: event.httpMethod,
		timestamp: new Date().toISOString(),
	};

	try {
		if (!event.body) {
			console.error("No form data received", { requestContext });
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

		// Skip Turnstile verification in development or test mode
		if (
			process.env.NODE_ENV === "development" ||
			process.env.NODE_ENV === "test"
		) {
			// console.info("Skipping Turnstile verification in development/test mode");
		} else {
			// Extract and verify Turnstile token from headers or form data
			const turnstileToken =
				event.headers["cf-turnstile-response"] ||
				formData.get("cf-turnstile-response");

			if (!turnstileToken) {
				console.error("Missing Turnstile verification token", {
					requestContext,
				});
				throw new Error("Missing Turnstile verification token");
			}

			// Get the client IP from various possible headers
			const clientIp =
				event.requestContext.identity?.sourceIp ||
				event.headers["x-forwarded-for"]?.split(",")[0];

			const verification = await verifyTurnstileToken(turnstileToken, clientIp);
			if (!verification.success) {
				// Log the actual error codes for debugging
				console.error("Turnstile verification failed:", {
					errors: verification.errors,
					requestContext,
				});

				// Provide a user-friendly error message
				throw new Error("Security verification failed. Please try again.");
			}
		}

		// Parse form data into structured user data
		parsedFormData = parseFormData(formData);

		// Get database client and insert data
		try {
			const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
			if (!dbUrl) {
				throw new Error(
					"Neither DATABASE_URL_TEST nor DATABASE_URL environment variables are set",
				);
			}
			client = await getDbClient(dbUrl);
			await insertSignupData(client, parsedFormData);

			// Return success response
			return {
				statusCode: 200,
				headers: HTML_HEADERS,
				body: getSuccessHtml(),
			};
		} catch (error) {
			console.error("Error processing signup:", error, {
				requestContext,
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
			});
			throw error;
		}
	} catch (error) {
		console.error("Error in signup handler:", error, {
			requestContext,
			errorType: error instanceof Error ? error.constructor.name : typeof error,
			errorStack: error instanceof Error ? error.stack : undefined,
		});

		// Create a user-friendly error message
		let userFriendlyMessage =
			"An unexpected error occurred. Please try again later.";

		// Determine if this is a client error (400) or server error (500)
		let statusCode = 500; // Default to server error

		// Only use specific error messages that we've explicitly created
		if (error instanceof Error) {
			// List of known user-friendly error messages
			const clientErrorMessages = [
				"A user with that phone number already exists.",
				"No form data received in request body",
				"Missing Turnstile verification token",
				"Security verification failed. Please try again.",
			];

			const serverErrorMessages = [
				"Failed to save your information. Please try again later.",
			];

			// Check if the error message is one we explicitly created
			const isClientError = clientErrorMessages.some((msg) =>
				error.message.includes(msg),
			);

			const isServerError = serverErrorMessages.some((msg) =>
				error.message.includes(msg),
			);

			if (isClientError) {
				statusCode = 400;
				userFriendlyMessage = error.message;
			} else if (isServerError || !isClientError) {
				statusCode = 500;
				userFriendlyMessage = error.message;
				// For server errors that aren't in our list, use the generic message
				if (!isServerError) {
					userFriendlyMessage =
						"An unexpected error occurred. Please try again later.";
				}
			}
		}

		// Return error response
		return {
			statusCode,
			headers: HTML_HEADERS,
			body: getErrorHtml(userFriendlyMessage),
		};
	} finally {
		// Close the client if it was created
		if (client) {
			closeDbClient(client);
		}
	}
};

export default { handler };
