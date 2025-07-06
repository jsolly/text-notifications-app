import type {
	ContactField,
	NotificationField,
	PreferenceField,
	SignupFormData,
} from "@text-notifications/shared";
import {
	CONTACT_SCHEMA,
	NOTIFICATION_SCHEMA,
	PREFERENCES_SCHEMA,
	parseNotificationPreferences,
	parseSchemaFields,
	USER_FIELDS,
} from "@text-notifications/shared";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import type { Sql } from "postgres";
import { closeDbClient, executeTransaction, getDbClient, shutdownPool } from "../shared/db.js";
import { getClientIp } from "../shared/ip-utils.js";

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

const getErrorHtml = (errorMessage: string) => `
<button type="submit" 
  id="submit_button"
  class="w-full bg-red-600 text-white cursor-not-allowed py-3 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors font-medium shadow-md"
  data-error="true"
  disabled>
  ${errorMessage}
</button>
`;

interface OperationResult {
	success: boolean;
	message: string;
	errors?: string[];
	data?: unknown;
}

interface FormDataResult extends Omit<OperationResult, "data"> {
	data?: {
		signupData: SignupFormData;
		turnstileToken: string | null;
	};
}

const insertSignupData = async (client: Sql, data: SignupFormData): Promise<OperationResult> => {
	try {
		await executeTransaction(client, async () => {
			const userData = (USER_FIELDS as readonly string[]).reduce<Record<string, string>>(
				(acc, field) => {
					if (field in data.contact_info) {
						acc[field] = (data.contact_info as Record<string, string>)[field];
					} else if (field in data.preferences) {
						acc[field] = (data.preferences as Record<string, string>)[field];
					}
					return acc;
				},
				{}
			);

			// full_phone is a generated column in the DB, so no need to add it to userData here.

			// Insert user data directly using postgres.js
			await client`
				INSERT INTO users (
					name, phone_number, phone_country_code, city_id, language, unit, time_format, notification_time
				) VALUES (
					${userData.name}, ${userData.phone_number}, ${userData.phone_country_code}, 
					${userData.city_id}, ${userData.language}, ${userData.unit}, 
					${userData.time_format}, ${userData.notification_time}
				)
			`;

			// Get the user ID
			const userResult = await client`
				SELECT id FROM users 
				WHERE phone_number = ${userData.phone_number} 
				AND phone_country_code = ${userData.phone_country_code}
			`;
			const userId = userResult[0].id;
			console.log({
				operation: "fetchedUserId",
				userId,
			});

			// Insert notification preferences
			await client`
				INSERT INTO notification_preferences (
					user_id, weather
				) VALUES (${userId}, ${data.notifications.weather})
			`;
		});
		return { success: true, message: "Signup successful" };
	} catch (error) {
		if (error instanceof Error && "code" in error) {
			const err = error as { code: string; constraint?: string; constraint_name?: string };
			const constraint = err.constraint || err.constraint_name;
			if (err.code === "23505" && constraint === "users_phone_country_code_phone_number_key") {
				console.warn("Duplicate user detected for phone: [REDACTED] (PII omitted)");
				return {
					success: false,
					message: "A user with that phone number already exists.",
					errors: ["duplicate-user"],
				};
			}
		}

		console.error("Unhandled error in insertSignupData, re-throwing:", error);
		return {
			success: false,
			message: "An unexpected error occurred. Please try again later.",
			errors: [error instanceof Error ? error.message : String(error)],
		};
	}
};

const parseSignupFormData = (event: APIGatewayProxyEvent): FormDataResult => {
	if (event.body == null) {
		return {
			success: false,
			message: "Request body is missing.",
			errors: ["missing-body"],
		};
	}

	const decodedBody = event.isBase64Encoded
		? Buffer.from(event.body, "base64").toString()
		: event.body;

	const formString = (() => {
		try {
			const parsedJson = JSON.parse(decodedBody);
			return typeof parsedJson?.body === "string" ? parsedJson.body : decodedBody;
		} catch {
			return decodedBody;
		}
	})();

	const formData = new URLSearchParams(formString);

	// Accept both lower-case and mixed-case header keys for Turnstile token
	const turnstileTokenFromHeader = Object.entries(event.headers || {}).find(
		([key]) => key.toLowerCase() === "cf-turnstile-response"
	)?.[1];
	const turnstileTokenFromForm = formData.get("cf-turnstile-response");

	const turnstileToken = turnstileTokenFromHeader || turnstileTokenFromForm;

	// Parse contact info using the schema
	const contactInfo = parseSchemaFields<ContactField>(formData, CONTACT_SCHEMA);

	// Parse preferences using the schema
	const preferences = parseSchemaFields<PreferenceField>(formData, PREFERENCES_SCHEMA);

	// Parse notifications using the schema
	const notifications = parseNotificationPreferences<NotificationField>(
		formData,
		NOTIFICATION_SCHEMA
	);

	const signupData: SignupFormData = {
		contact_info: contactInfo,
		preferences,
		notifications,
	};

	return {
		success: true,
		message: "Form data parsed successfully.",
		data: {
			signupData,
			turnstileToken,
		},
	};
};

const verifyTurnstileToken = async (token: string, remoteIp?: string): Promise<OperationResult> => {
	// Additional validation to ensure token is valid
	if (!token || typeof token !== "string" || token.trim() === "") {
		return {
			success: false,
			message: "Invalid Turnstile token provided.",
			errors: ["invalid-token"],
		};
	}

	const verificationUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
	const secretKey = process.env.TURNSTILE_SECRET_KEY;

	if (!secretKey) {
		console.error("TURNSTILE_SECRET_KEY environment variable is not set");
		return {
			success: false,
			message: "Turnstile configuration error.",
			errors: ["missing-secret-key"],
		};
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
			console.error("Turnstile verification failed with status:", response.status);
			return {
				success: false,
				message: "Turnstile verification failed.",
				errors: ["turnstile-verification-failed"],
			};
		}

		const result = (await response.json()) as { success: boolean };
		return {
			success: result.success,
			message: "Turnstile verification successful.",
		};
	} catch (error) {
		console.error("Error verifying Turnstile token:", error);
		return {
			success: false,
			message: "Turnstile verification failed.",
			errors: [error instanceof Error ? error.message : String(error)],
		};
	}
};

/**
 * Processes the sign-up form submission and stores user preferences
 * Note: This function is async to support future database operations and SMS service integration
 */
export const handler = async (
	event: APIGatewayProxyEvent,
	_context: Context
): Promise<APIGatewayProxyResult> => {
	let client: Sql | null = null;
	let parsedSignupData: SignupFormData | undefined;

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
		const signupFormDataResult = parseSignupFormData(event);
		if (!signupFormDataResult.success) {
			return {
				statusCode: 400,
				headers: HTML_HEADERS,
				body: getErrorHtml(signupFormDataResult.message),
			};
		}
		parsedSignupData = signupFormDataResult.data?.signupData;
		const turnstileToken = signupFormDataResult.data?.turnstileToken;

		// Skip Turnstile verification in development or test mode
		if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
			// console.info("Skipping Turnstile verification in development/test mode");
		} else {
			// Validate that we have a valid Turnstile token before verification
			if (!turnstileToken || typeof turnstileToken !== "string" || turnstileToken.trim() === "") {
				return {
					statusCode: 400, // Bad Request
					headers: HTML_HEADERS,
					body: getErrorHtml("Turnstile verification token is missing or invalid."),
				};
			}

			const clientIp = getClientIp(event);

			const verification = await verifyTurnstileToken(turnstileToken, clientIp);
			if (!verification.success) {
				return {
					statusCode: 403, // Forbidden
					headers: HTML_HEADERS,
					body: getErrorHtml(
						verification.errors?.join(", ") ||
							"Turnstile verification failed for an unknown reason."
					),
				};
			}
		}

		const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

		// Attempt to establish database connection with explicit error handling
		try {
			client = await getDbClient(dbUrl as string);
		} catch (dbConnectionError) {
			console.error("Database connection failed:", dbConnectionError, {
				requestContext,
				errorType:
					dbConnectionError instanceof Error
						? dbConnectionError.constructor.name
						: typeof dbConnectionError,
				errorStack: dbConnectionError instanceof Error ? dbConnectionError.stack : undefined,
			});

			return {
				statusCode: 503, // Service Unavailable
				headers: HTML_HEADERS,
				body: getErrorHtml("Database connection failed. Please try again later."),
			};
		}

		const signupProcessingResult = await insertSignupData(client, parsedSignupData);

		if (signupProcessingResult.success) {
			return {
				statusCode: 201,
				headers: HTML_HEADERS,
				body: getSuccessHtml(),
			};
		}

		if (signupProcessingResult.errors?.includes("duplicate-user")) {
			return {
				statusCode: 409, // Conflict for duplicate user
				headers: HTML_HEADERS,
				body: getErrorHtml(signupProcessingResult.message as string),
			};
		}

		// Handle any other errors
		return {
			statusCode: 500,
			headers: HTML_HEADERS,
			body: getErrorHtml(signupProcessingResult.message as string),
		};
	} catch (_error) {
		console.error("Error in signup handler:", _error, {
			requestContext,
			errorType: _error instanceof Error ? _error.constructor.name : typeof _error,
			errorStack: _error instanceof Error ? _error.stack : undefined,
		});

		const userFriendlyMessage = "An unexpected error occurred. Please try again later.";
		return {
			statusCode: 500,
			headers: HTML_HEADERS,
			body: getErrorHtml(userFriendlyMessage),
		};
	} finally {
		if (client) {
			closeDbClient(client);
			client = null;
		}
	}
};

/**
 * Lambda shutdown handler to clean up database connections
 * This ensures proper cleanup when the Lambda container is shutting down
 */
const handleShutdown = async (signal: string) => {
	console.log(`Received ${signal}, shutting down database connections...`);
	try {
		await shutdownPool();
		console.log("Database connections closed successfully");
	} catch (error) {
		console.error("Error during database shutdown:", error);
	}
	process.exit(0);
};

// Register shutdown handlers for graceful cleanup
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

export default { handler };
