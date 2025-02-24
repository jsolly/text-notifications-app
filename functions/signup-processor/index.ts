import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import type {
	SignupFormData,
	NotificationTime,
} from "../../shared/types/form.schema";
import { getDbClient, insertSignupData } from "./db";
import type { Client } from "pg";

const HTML_HEADERS = {
	"Content-Type": "text/html",
};

const parseFormData = (formData: URLSearchParams): SignupFormData => {
	// Log raw form data entries for debugging
	console.debug(
		"Raw form data entries:",
		Object.fromEntries(formData.entries()),
	);

	const selectedNotifications = formData.getAll("notifications");
	console.debug("Selected notifications:", selectedNotifications);

	const signupData = {
		contactInfo: {
			name: formData.get("name"),
			phoneNumber: formData.get("phone-number"),
			cityId: formData.get("city"),
		},
		preferences: {
			preferredLanguage: formData.get("preferredLanguage") as
				| "en"
				| "es"
				| "fr",
			unitPreference: formData.get("unitPreference") as "metric" | "imperial",
			timeFormat: formData.get("timeFormat") as "24h" | "12h",
			dailyNotificationTime: formData.get(
				"dailyNotificationTime",
			) as NotificationTime,
		},
		notifications: {
			dailyFullmoon: selectedNotifications.includes("fullmoon"),
			dailyNasa: selectedNotifications.includes("nasa"),
			dailyWeatherOutfit: selectedNotifications.includes("weatherOutfit"),
			dailyRecipe: selectedNotifications.includes("recipe"),
			instantSunset: selectedNotifications.includes("sunset"),
		},
	};

	// Log parsed data for debugging
	console.debug("Parsed signup data:", JSON.stringify(signupData, null, 2));

	// Validate required fields
	if (!signupData.contactInfo.phoneNumber) {
		throw new Error("Phone number is required");
	}
	if (!signupData.contactInfo.cityId) {
		throw new Error("City is required");
	}

	return signupData;
};

/**
 * Verifies the Cloudflare Turnstile token with their API
 */
const verifyTurnstileToken = async (
	token: string,
	remoteIp?: string,
): Promise<{ success: boolean; errors: string[] }> => {
	// Skip verification in development mode
	if (process.env.NODE_ENV === "development") {
		console.debug("Skipping Turnstile verification in development mode");
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

	const response = await fetch(verificationUrl, {
		method: "POST",
		body: formData,
	});

	const result = await response.json();
	console.debug("Turnstile verification result:", result);

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
	context: Context,
): Promise<APIGatewayProxyResult> => {
	let client: Client | null = null;
	try {
		if (!event.body) {
			throw new Error("No form data received in request body");
		}

		// Log raw request body and content type for debugging
		console.debug("Request headers:", event.headers);

		// Handle both base64 and non-base64 encoded bodies
		const decodedBody = event.isBase64Encoded
			? Buffer.from(event.body, "base64").toString()
			: event.body;
		console.debug("Decoded body:", decodedBody);

		const formData = new URLSearchParams(decodedBody);

		// Extract and verify Turnstile token from headers
		const turnstileToken = event.headers["cf-turnstile-response"];

		// Get the client IP from various possible headers
		const clientIp =
			event.requestContext.identity?.sourceIp ||
			event.headers["x-forwarded-for"]?.split(",")[0] ||
			event.headers["X-Forwarded-For"]?.split(",")[0];

		// Skip Turnstile verification in development mode
		if (process.env.NODE_ENV !== "development") {
			const verification = await verifyTurnstileToken(turnstileToken, clientIp);
			if (!verification.success) {
				const errorMessage =
					verification.errors.length > 0
						? `Turnstile verification failed: ${verification.errors.join(", ")}`
						: "Invalid Turnstile verification token";
				throw new Error(errorMessage);
			}
		}

		const userData = parseFormData(formData);

		console.debug("Getting database client...");
		client = await getDbClient();

		await new Promise((resolve) => setTimeout(resolve, 1000));
		return {
			statusCode: 200,
			headers: HTML_HEADERS,
			body: `
                <div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                    <div class="text-blue-700">Hello World!</div>
                </div>
            `,
		};

		// await insertSignupData(client, userData);

		// return {
		//     statusCode: 200,
		//     headers: HTML_HEADERS,
		//     body: `
		//         <div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
		//             <div class="flex items-center space-x-3 text-green-700 bg-green-50 p-4 rounded-lg border border-green-200">
		//                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
		//                     <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
		//                 </svg>
		//                 <div>
		//                     <h3 class="font-medium">Success!</h3>
		//                     <p class="text-sm text-green-600">You're all set to receive notifications.</p>
		//                 </div>
		//             </div>
		//         </div>
		//     `,
		// };
	} catch (error) {
		console.error("Error processing signup:", {
			name: error instanceof Error ? error.name : "Unknown error",
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		const isPhoneNumberConflict =
			error instanceof Error &&
			error.message === "A user with that phone number already exists.";

		const isTurnstileError =
			error instanceof Error &&
			(error.message.includes("Turnstile") || error.message.includes("token"));

		const errorMessage = isPhoneNumberConflict
			? error.message
			: error instanceof Error
				? error.message
				: "An error occurred during sign-up";

		return {
			statusCode: isPhoneNumberConflict ? 409 : isTurnstileError ? 400 : 500,
			headers: HTML_HEADERS,
			body: `
				<div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
					<div class="flex items-center space-x-3 text-red-700 bg-red-50 p-4 rounded-lg border border-red-200">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
						</svg>
						<div>
							<h3 class="font-medium">Error</h3>
							<p class="text-sm text-red-600">${errorMessage}</p>
						</div>
					</div>
				</div>
			`,
		};
	} finally {
		if (client) {
			await client.end();
		}
	}
};
