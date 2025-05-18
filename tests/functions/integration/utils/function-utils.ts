import { handler as signupHandler } from "../../../../backend/functions/signup-processor/index.js";
import { handler as apodHandler } from "../../../../backend/functions/apod-photo-fetcher/index.js";
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import {
	createAPIGatewayProxyEvent,
	createEventBridgeEvent,
} from "./lambda-utils.js";
import {
	getDbClient,
	closeDbClient,
} from "../../../../backend/functions/shared/db.js";
import type { PoolClient } from "pg";
import type { User } from "../../../../backend/functions/shared/db.js";

export function generateSignupFormData(options = { failureNumber: false }) {
	// Use Twilio's magic test numbers
	// 5005550006 - successful delivery
	// 5005550009 - failure (non-mobile)
	const phoneNumber = options.failureNumber ? "5005550009" : "5005550006";

	const formData = new URLSearchParams(); // TODO: Add a timezone to the form data
	// User Preferences
	formData.append("name", "Test User");
	formData.append("phone_country_code", "+1");
	formData.append("phone_number", phoneNumber);
	formData.append("city_id", "126104");
	formData.append("language", "en");
	formData.append("unit", "imperial");
	formData.append("time_format", "12h");
	formData.append("notification_time", "morning");

	// Notification Preferences
	formData.append("astronomy_photo", "true");
	formData.append("celestial_events", "false");
	formData.append("weather_outfits", "false");
	formData.append("recipes", "false");
	formData.append("sunset_alerts", "false");

	return formData;
}

export async function createTestUser(
	options = { failureNumber: false },
): Promise<User> {
	const formData = generateSignupFormData(options);
	const phoneCountryCode = formData.get("phone_country_code");
	const phoneNumber = formData.get("phone_number");

	const fullPhoneNumber = phoneCountryCode + phoneNumber;

	const event = createAPIGatewayProxyEvent("/signup", "POST", "/signup", {
		body: formData.toString(),
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});

	const signupResult = await signupHandler(event, {} as Context);

	// If user creation failed with something OTHER than a 409 (Conflict), then it's an issue.
	// A 409 means the user likely already exists, which is acceptable for this utility.
	if (
		signupResult.statusCode !== 200 &&
		signupResult.statusCode !== 201 &&
		signupResult.statusCode !== 409
	) {
		console.error(
			"User creation/check failed with unexpected status code:",
			signupResult.statusCode,
			signupResult.body,
		);
		throw new Error(
			`User creation/check failed with status code ${signupResult.statusCode}`,
		);
	}
	// If it was a 409, we assume the user exists and will try to fetch them.
	// If it was 200/201, the user was created, and we fetch them to get their ID.

	let client: PoolClient | null = null;
	try {
		const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
		if (!dbUrl) {
			throw new Error("DATABASE_URL_TEST or DATABASE_URL not set");
		}
		client = await getDbClient(dbUrl);
		const queryResult = await client.query(
			`SELECT 
        id as user_id, 
        full_phone, 
        language, 
        name, 
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
