import type { Context } from "aws-lambda";
import type { PoolClient } from "pg";
import { handler as apodHandler } from "../../../../backend/functions/apod-photo-fetcher/index.js";
import type { User } from "../../../../backend/functions/shared/db.js";
import {
	closeDbClient,
	getDbClient,
} from "../../../../backend/functions/shared/db.js";
import { handler as signupHandler } from "../../../../backend/functions/signup-processor/index.js";
import {
	createAPIGatewayProxyEvent,
	createEventBridgeEvent,
} from "./lambda-utils.js";

export function generateSignupFormData(
	options: {
		failureNumber?: boolean;
		notificationPreferences?: Record<string, boolean>;
	} = {},
) {
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
	const defaultPrefs = {
		astronomy_photo: true,
		celestial_events: false,
		weather_outfits: false,
		recipes: false,
		sunset_alerts: false,
	};
	const prefs = { ...defaultPrefs, ...(options.notificationPreferences || {}) };
	for (const [key, value] of Object.entries(prefs)) {
		formData.append(key, String(value));
	}

	return formData;
}

export async function createTestUser(
	options: {
		failureNumber?: boolean;
		notificationPreferences?: Record<string, boolean>;
	} = {},
): Promise<User> {
	// Always disable all preferences except those explicitly set
	const allPrefs = {
		astronomy_photo: false,
		celestial_events: false,
		weather_outfits: false,
		recipes: false,
		sunset_alerts: false,
		...(options.notificationPreferences || {}),
	};
	const formData = generateSignupFormData({
		failureNumber: options.failureNumber,
		notificationPreferences: allPrefs,
	});
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

	// Wait for APOD record to exist (race condition fix)
	const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
	if (!dbUrl) throw new Error("DATABASE_URL_TEST or DATABASE_URL not set");
	const client = await getDbClient(dbUrl);
	let found = false;
	for (let i = 0; i < 15; i++) {
		const result = await client.query(
			"SELECT * FROM nasa_apod ORDER BY date DESC LIMIT 1",
		);
		if (result.rows.length > 0) {
			console.log("APOD record found after", i + 1, "tries");
			found = true;
			break;
		}
		await new Promise((res) => setTimeout(res, 200));
	}
	await closeDbClient(client);
	if (!found) {
		console.error("APOD record not found after creation (all retries)");
		throw new Error("APOD record not found after creation");
	}
}
