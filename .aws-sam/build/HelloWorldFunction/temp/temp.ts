// import type {
// 	SignupFormData,
// 	Language,
// 	Unit,
// 	TimeFormat,
// } from "../../../../shared/types/form.schema";
// import type {
// 	APIGatewayProxyEvent,
// 	APIGatewayProxyResult,
// 	Context,
// } from "aws-lambda";
// import { getDbClient } from "../db";

// // Constants
// const DEFAULT_TIMEZONE = "UTC";
// const DEFAULT_NOTIFICATION_TIME = "09:00";

// /**
//  * Parses the URL-encoded form body into a SignupFormData object.
//  */
// function parseFormData(body: string): SignupFormData {
// 	const params = new URLSearchParams(body);

// 	return {
// 		contactInfo: {
// 			name: params.get("name") ?? "",
// 			phoneNumber: params.get("phoneNumber") ?? "",
// 			cityId: params.get("cityId") ?? "",
// 		},
// 		preferences: {
// 			preferredLanguage: (params.get("preferredLanguage") as Language) ?? "en",
// 			unitPreference: (params.get("unitPreference") as Unit) ?? "metric",
// 			timeFormat: (params.get("timeFormat") as TimeFormat) ?? "24h",
// 			notificationTimezone:
// 				params.get("notificationTimezone") ?? DEFAULT_TIMEZONE,
// 		},
// 		notifications: {
// 			dailyFullmoon: params.get("dailyFullmoon") === "on",
// 			dailyNasa: params.get("dailyNasa") === "on",
// 			dailyWeatherOutfit: params.get("dailyWeatherOutfit") === "on",
// 			dailyRecipe: params.get("dailyRecipe") === "on",
// 			instantSunset: params.get("instantSunset") === "on",
// 			dailyNotificationTime:
// 				params.get("notificationTime") ?? DEFAULT_NOTIFICATION_TIME,
// 		},
// 	};
// }

// /**
//  * Saves the parsed signup form data into Postgres.
//  */
// const saveToPostgres = async (data: SignupFormData): Promise<string> => {
// 	const client = await getDbClient();

// 	const INSERT_USER_SQL = `
// 		INSERT INTO users
// 			(phone_number, city_id, preferred_language, unit_preference, time_format, notification_timezone)
// 		VALUES ($1, $2, $3, $4, $5, $6)
// 		RETURNING user_id
// 	`;

// 	const INSERT_PREFERENCES_SQL = `
// 		INSERT INTO notification_preferences
// 			(user_id, daily_notification_time, daily_fullmoon, daily_nasa, daily_weather_outfit, daily_recipe, instant_sunset)
// 		VALUES ($1, $2, $3, $4, $5, $6, $7)
// 	`;

// 	try {
// 		const userResult = await client.query(INSERT_USER_SQL, [
// 			data.contactInfo.phoneNumber,
// 			data.contactInfo.cityId,
// 			data.preferences.preferredLanguage,
// 			data.preferences.unitPreference,
// 			data.preferences.timeFormat,
// 			DEFAULT_TIMEZONE,
// 		]);

// 		await client.query(INSERT_PREFERENCES_SQL, [
// 			userResult.rows[0].user_id,
// 			DEFAULT_NOTIFICATION_TIME,
// 			data.notifications.dailyFullmoon,
// 			data.notifications.dailyNasa,
// 			data.notifications.dailyWeatherOutfit,
// 			data.notifications.dailyRecipe,
// 			data.notifications.instantSunset,
// 		]);

// 		return userResult.rows[0].user_id;
// 	} finally {
// 		await client.end();
// 	}
// };

// /**
//  * Returns an HTML response for success or failure.
//  */
// const createHtmlResponse = (
// 	statusCode: number,
// 	success: boolean,
// ): APIGatewayProxyResult => {
// 	const body = success
// 		? `
//       <div class="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
//         <h2 class="text-2xl font-bold text-green-800 mb-3">Successfully Signed Up!</h2>
//         <p class="text-green-700">You will start receiving notifications for your selected events.</p>
//         <button
//           class="mt-6 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
//           onclick="window.location.reload()">
//           Sign Up Another
//         </button>
//       </div>
//     `
// 		: `
//       <div class="bg-red-50 border border-red-200 rounded-xl p-8">
//         <h2 class="text-2xl font-bold text-red-800 mb-3">Sign Up Failed</h2>
//         <p class="text-red-700">There was an error processing your request. Please try again.</p>
//         <button
//           class="mt-6 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
//           onclick="window.location.reload()">
//           Try Again
//         </button>
//       </div>
//     `;

// 	return {
// 		statusCode,
// 		headers: { "Content-Type": "text/html" },
// 		body,
// 	};
// };

// /**
//  * The main Lambda handler.
//  */
// export const handler = async (
// 	event: APIGatewayProxyEvent,
// 	context: Context,
// ): Promise<APIGatewayProxyResult> => {
// 	try {
// 		// Debug logging for event and context
// 		console.log("Event:", JSON.stringify(event, null, 2));
// 		console.log("Context:", JSON.stringify(context, null, 2));

// 		// Artificial delay to inspect logs (5 seconds)
// 		await new Promise((resolve) => setTimeout(resolve, 1000));

// 		const data = parseFormData(event.body || "");
// 		// await saveToPostgres(data);
// 		return createHtmlResponse(200, true);
// 	} catch (error) {
// 		console.error("Error processing signup:", error);
// 		return createHtmlResponse(500, false);
// 	}
// };
