import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import type { SignupFormData } from "../../shared/types/form.schema";
import { parse } from "node:querystring";

const corsHeaders = {
	"Access-Control-Allow-Origin": "http://localhost:4321",
	"Access-Control-Allow-Methods": "POST, OPTIONS, GET",
	"Access-Control-Allow-Headers":
		"Content-Type, HX-Current-URL, HX-Request, HX-Trigger, HX-Target",
	"Access-Control-Allow-Credentials": "true",
};

// Basic phone validation - will be replaced with proper validation later
const validatePhoneNumber = async (phone: string): Promise<boolean> =>
	Promise.resolve(phone.match(/^\(\d{3}\)\s\d{3}-\d{4}$/) !== null);

/**
 * Processes the sign-up form submission and stores user preferences
 * Note: This function is async to support future database operations and SMS service integration
 */
export const lambdaHandler = (
	event: APIGatewayProxyEvent,
	context: Context,
): Promise<APIGatewayProxyResult> => {
	try {
		const formFields = parse(event.body);
		const phoneNumber = formFields["phone-number"]?.toString() || "";

		// Map form fields to SignupFormData structure
		const formData: SignupFormData = {
			contactInfo: {
				phoneNumber,
				cityId: formFields.city,
			},
			preferences: {
				preferredLanguage:
					(formFields.preferredLanguage?.toString() as "en") || "en",
				unitPreference:
					(formFields.unitPreference?.toString() as "metric") || "metric",
				timeFormat:
					(formFields.timeFormat?.toString() as "24h" | "12h") || "24h",
				notificationTimezone: "UTC", // Not in form yet, defaulting to UTC
			},
			notifications: {
				dailyFullmoon: true,
				dailyNasa: true,
				dailyWeatherOutfit: true,
				dailyRecipe: true,
				instantSunset: true,
				dailyNotificationTime:
					formFields.notificationTime?.toString() || "morning",
			},
		};

		// TODO: Add validation for required fields
		// TODO: Store the user data in a database
		// TODO: Set up notification preferences
		// TODO: Initialize SMS service for the user

		// For now, return success response
		return {
			statusCode: 200,
			headers: {
				...corsHeaders,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				message: "Sign-up successful",
				data: {
					contactInfo: {
						phoneNumber: formData.contactInfo.phoneNumber,
						cityId: formData.contactInfo.cityId,
					},
					preferences: formData.preferences,
					notifications: formData.notifications,
				},
			}),
		};
	} catch (error) {
		console.error("Error processing signup:", error);
		return {
			statusCode: 500,
			headers: {
				...corsHeaders,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				error: "Internal server error",
				message: "Failed to process signup request",
			}),
		};
	}
};
