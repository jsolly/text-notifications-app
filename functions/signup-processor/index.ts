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
	const selectedNotifications = formData.getAll("notifications");

	const signupData = {
		contactInfo: {
			name: formData.get("name") || "Friend",
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

	return signupData;
};

/**
 * Processes the sign-up form submission and stores user preferences
 * Note: This function is async to support future database operations and SMS service integration
 */
export const handler = async (
	event: APIGatewayProxyEvent,
	context: Context,
	testClient?: Client,
): Promise<APIGatewayProxyResult> => {
	let client: Client | null = null;
	try {
		if (!event.body) {
			throw new Error("No form data received in request body");
		}

		const formData = new URLSearchParams(event.body);
		const userData = parseFormData(formData);

		client = testClient || (await getDbClient());
		await insertSignupData(client, userData);

		return {
			statusCode: 200,
			headers: HTML_HEADERS,
			body: `
				<div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
					<div class="flex items-center space-x-3 text-green-700 bg-green-50 p-4 rounded-lg border border-green-200">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
						</svg>
						<div>
							<h3 class="font-medium">Success!</h3>
							<p class="text-sm text-green-600">You're all set to receive notifications.</p>
						</div>
					</div>
				</div>
			`,
		};
	} catch (error) {
		console.error("Error processing signup:", {
			name: error instanceof Error ? error.name : "Unknown error",
			message: error instanceof Error ? error.message : String(error),
		});

		const isPhoneNumberConflict =
			error instanceof Error &&
			error.message === "A user with that phone number already exists.";

		const errorMessage = isPhoneNumberConflict
			? error.message
			: "An error occurred during sign-up";

		return {
			statusCode: isPhoneNumberConflict ? 409 : 500,
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
		if (client && !testClient) {
			await client.end();
		}
	}
};
