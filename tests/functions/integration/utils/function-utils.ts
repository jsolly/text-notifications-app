import { handler as signupHandler } from "../../../../backend/functions/signup-processor/index";
import { handler as apodHandler } from "../../../../backend/functions/apod-photo-fetcher/index";
import type { Context } from "aws-lambda";
import {
	createAPIGatewayProxyEvent,
	createEventBridgeEvent,
} from "./lambda-utils";
import {
	getDbClient,
	closeDbClient,
} from "../../../../backend/functions/shared/db";
import type { PoolClient } from "pg";
import type { User } from "../../../../backend/functions/shared/db";

export function generateSignupFormData(options = { failureNumber: false }) {
	// Use Twilio's magic test numbers
	// 5005550006 - successful delivery
	// 5005550009 - failure (non-mobile)
	const phoneNumber = options.failureNumber ? "5005550009" : "5005550006";

	const formData = new URLSearchParams();
	// User Preferences
	formData.append("name_preference", "Test User");
	formData.append("phone_country_code", "+1");
	formData.append("phone_number", phoneNumber);
	formData.append("city_id", "126104");
	formData.append("language_preference", "en");
	formData.append("unit_preference", "imperial");
	formData.append("time_format_preference", "12h");
	formData.append("notification_time_preference", "morning");

	// Notification Preferences
	formData.append("astronomy_photo_of_the_day", "true");
	formData.append("celestial_events", "false");
	formData.append("weather_outfit_suggestions", "false");
	formData.append("recipe_suggestions", "false");
	formData.append("sunset_alerts", "false");

	return formData;
}

export async function createTestUser(
	options = { failureNumber: false },
): Promise<User> {
	const formData = generateSignupFormData(options);
	const fullPhoneNumber =
		(formData.get("phone_country_code") || "") +
		(formData.get("phone_number") || "");

	const event = createAPIGatewayProxyEvent("/signup", "POST", "/signup", {
		body: formData.toString(),
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});

	const signupResult = await signupHandler(event, {} as Context);

	if (signupResult.statusCode !== 200) {
		console.error("User creation failed:", signupResult.body);
		throw new Error(
			`User creation failed with status code ${signupResult.statusCode}`,
		);
	}

	let client: PoolClient | null = null;
	try {
		const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
		if (!dbUrl) {
			throw new Error("DATABASE_URL_TEST or DATABASE_URL not set");
		}
		client = await getDbClient(dbUrl);
		const queryResult = await client.query(
			`SELECT 
        user_id, 
        full_phone, 
        language_preference AS language, 
        name_preference AS name, 
        city_id 
      FROM users WHERE full_phone = $1`,
			[fullPhoneNumber],
		);

		if (queryResult.rows.length === 0) {
			throw new Error(
				`User not found with phone number ${fullPhoneNumber} after creation.`,
			);
		}
		return queryResult.rows[0] as User;
	} catch (error) {
		console.error("Error fetching user_id after creation:", error);
		throw error; // Re-throw the error to fail the test
	} finally {
		if (client) {
			closeDbClient(client);
		}
	}
}

export async function createAPODRecord() {
	const apod_event = createEventBridgeEvent();
	await apodHandler(apod_event, {} as Context);
}
