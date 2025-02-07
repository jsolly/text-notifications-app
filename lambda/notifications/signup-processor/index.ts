import type { SignupFormData } from "../../../types/form.types";
import type { Language } from "../../../types/form.types";
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import { SNS } from "aws-sdk";
import { getDbClient } from "./db";

// Constants - since they're missing from form.consts.ts, let's define them here
const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_NOTIFICATION_TIME = "09:00";

// Initialize AWS clients
const sns = new SNS();

const saveToPostgres = async (data: SignupFormData): Promise<string> => {
	const client = await getDbClient();

	try {
		const userResult = await client.query(
			`
			INSERT INTO users (phone_number, city_id, preferred_language, unit_preference, time_format, notification_timezone)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING user_id
			`,
			[
				data.contactInfo.phone,
				data.contactInfo.cityId,
				data.preferences.language,
				data.preferences.unit,
				data.preferences.timeFormat,
				DEFAULT_TIMEZONE,
			],
		);

		// Insert notification preferences
		await client.query(
			`
			INSERT INTO notification_preferences (user_id, daily_notification_time, alerts_enabled, forecast_enabled, severe_weather_enabled)
			VALUES ($1, $2, $3, $4, $5)
			`,
			[
				userResult.rows[0].user_id,
				DEFAULT_NOTIFICATION_TIME,
				data.notifications.alerts_enabled,
				data.notifications.forecast_enabled,
				data.notifications.severe_weather_enabled,
			],
		);

		return userResult.rows[0].user_id;
	} finally {
		await client.end();
	}
};

const sendWelcomeNotification = async (
	phone: string,
	language: Language,
): Promise<void> => {
	const topicArn = process.env.WELCOME_TOPIC_ARN;
	if (!topicArn) {
		throw new Error("WELCOME_TOPIC_ARN environment variable not set");
	}

	await sns
		.publish({
			TopicArn: topicArn,
			Message: JSON.stringify({ phone, language }),
			MessageAttributes: {
				messageType: { DataType: "String", StringValue: "welcome" },
			},
		})
		.promise();
};

const createHtmlResponse = (
	statusCode: number,
	success: boolean,
): APIGatewayProxyResult => {
	const body = success
		? `
      <div class="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <h2 class="text-2xl font-bold text-green-800 mb-3">Successfully Signed Up!</h2>
        <p class="text-green-700">You will start receiving notifications for your selected events.</p>
        <button 
          class="mt-6 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
          onclick="window.location.reload()">
          Sign Up Another
        </button>
      </div>
    `
		: `
      <div class="bg-red-50 border border-red-200 rounded-xl p-8">
        <h2 class="text-2xl font-bold text-red-800 mb-3">Sign Up Failed</h2>
        <p class="text-red-700">There was an error processing your request. Please try again.</p>
        <button 
          class="mt-6 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    `;

	return {
		statusCode,
		headers: { "Content-Type": "text/html" },
		body,
	};
};

export const handler = async (
	event: APIGatewayProxyEvent,
	context: Context,
): Promise<APIGatewayProxyResult> => {
	try {
		const data = parseFormData(event.body || "");
		const userId = await saveToPostgres(data);
		await sendWelcomeNotification(
			data.contactInfo.phone,
			data.preferences.language,
		);
		return createHtmlResponse(200, true);
	} catch (error) {
		console.error("Error processing signup:", error);
		return createHtmlResponse(500, false);
	}
};
