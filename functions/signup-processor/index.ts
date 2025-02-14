import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import type {
	SignupFormData,
	NotificationTime,
} from "../../shared/types/form.schema";

/**
 * Processes the sign-up form submission and stores user preferences
 * Note: This function is async to support future database operations and SMS service integration
 */
export const lambdaHandler = (
	event: APIGatewayProxyEvent,
	context: Context,
): Promise<APIGatewayProxyResult> => {
	try {
		const formData = new URLSearchParams(event.body);
		const selectedNotifications = formData.getAll("notifications");

		// Map form fields to SignupFormData structure
		const userData: SignupFormData = {
			contactInfo: {
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
			},
			notifications: {
				dailyFullmoon: selectedNotifications.includes("fullmoon"),
				dailyNasa: selectedNotifications.includes("nasa"),
				dailyWeatherOutfit: selectedNotifications.includes("weatherOutfit"),
				dailyRecipe: selectedNotifications.includes("recipe"),
				instantSunset: selectedNotifications.includes("sunset"),
				dailyNotificationTime: formData.get(
					"notificationTime",
				) as NotificationTime,
			},
		};

		// For now, return success response
		return Promise.resolve({
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				message: "Sign-up successful",
				data: {
					contactInfo: {
						phoneNumber: userData.contactInfo.phoneNumber,
						cityId: userData.contactInfo.cityId,
					},
					preferences: userData.preferences,
					notifications: userData.notifications,
				},
			}),
		});
	} catch (error) {
		console.error("Error processing signup:", error);
		return Promise.resolve({
			statusCode: 500,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				error: "Internal server error",
				message: "Failed to process signup request",
			}),
		});
	}
};
