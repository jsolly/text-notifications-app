import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import type { SignupFormData } from "../../shared/types/form.schema";

const corsHeaders = {
	"Access-Control-Allow-Origin": "http://localhost:4321",
	"Access-Control-Allow-Methods": "POST, OPTIONS, GET",
	"Access-Control-Allow-Headers":
		"Content-Type, HX-Current-URL, HX-Request, HX-Trigger, HX-Target",
	"Access-Control-Allow-Credentials": "true",
};

/**
 * Processes the sign-up form submission and stores user preferences
 * Note: This function is async to support future database operations and SMS service integration
 */
export const lambdaHandler = async (
	event: APIGatewayProxyEvent,
	context: Context,
): Promise<APIGatewayProxyResult> => {
	// Handle OPTIONS preflight request
	if (event.httpMethod === "OPTIONS") {
		return {
			statusCode: 200,
			headers: corsHeaders,
			body: "",
		};
	}

	try {
		// Parse the POST body
		if (!event.body) {
			return {
				statusCode: 400,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					error: "Missing request body",
				}),
			};
		}

		const formData = (await Promise.resolve(
			JSON.parse(event.body),
		)) as SignupFormData;

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
						name: formData.contactInfo.name,
						phoneNumber: formData.contactInfo.phoneNumber,
						// Don't send back full city info for privacy
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
