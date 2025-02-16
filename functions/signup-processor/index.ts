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

const parseFormData = (formData: URLSearchParams): SignupFormData => {
	const selectedNotifications = formData.getAll("notifications");

	return {
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
};

/**
 * Processes the sign-up form submission and stores user preferences
 * Note: This function is async to support future database operations and SMS service integration
 */
export const lambdaHandler = async (
	event: APIGatewayProxyEvent,
	context: Context,
): Promise<APIGatewayProxyResult> => {
	try {
		const formData = new URLSearchParams(event.body);
		const userData = parseFormData(formData);

		const client = await getDbClient();
		try {
			await insertSignupData(client, userData);
			return {
				statusCode: 200,
				headers: {
					"Content-Type": "text/html",
				},
				body: "Sign-up successful!",
			};
		} finally {
			await client.end();
		}
	} catch (error) {
		console.error("Error processing signup:", error);
		const isPhoneNumberConflict =
			error instanceof Error &&
			error.message === "A user with that phone number already exists.";

		return {
			statusCode: isPhoneNumberConflict ? 409 : 500,
			headers: {
				"Content-Type": "text/html",
			},
			body: isPhoneNumberConflict
				? error.message
				: "An error occurred during sign-up",
		};
	}
};
