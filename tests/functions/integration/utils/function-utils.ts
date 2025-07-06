import type { Context } from "aws-lambda";
import type { Sql } from "postgres";
import type { User } from "../../../../backend/functions/shared/db.js";
import {
	closeDbClient,
	getDbClient,
} from "../../../../backend/functions/shared/db.js";
import { handler as signupHandler } from "../../../../backend/functions/signup-processor/index.js";
import { createAPIGatewayProxyEvent } from "./lambda-utils.js";

export function generateSignupFormData(
	options: {
		failureNumber?: boolean;
		notificationPreferences?: Record<string, boolean>;
	} = {},
) {
	// When using Twilio test credentials:
	// - FROM number must be +15005550006
	// - Use any valid phone number for TO to simulate success
	// - Use +15005550009 for TO to simulate "not a mobile number" error
	// When using real credentials, use real phone numbers
	const useTestCredentials = process.env.USE_TWILIO_TEST_CREDENTIALS === "true";
	const successNumber = useTestCredentials
		? "2125551234" // Use a realistic NYC phone number format for test credentials
		: process.env.TWILIO_TARGET_PHONE_NUMBER?.replace("+1", "") || "8777804236";
	const phoneNumber = options.failureNumber ? "5005550009" : successNumber;

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
		weather: true,
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
		weather: false,
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

	let client: Sql | null = null;
	try {
		const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
		if (!dbUrl) {
			throw new Error("DATABASE_URL_TEST or DATABASE_URL not set");
		}
		client = await getDbClient(dbUrl);
		const queryResult = await client`
        SELECT 
          id as user_id, 
          full_phone, 
          language, 
          name, 
          city_id 
        FROM users WHERE full_phone = ${fullPhoneNumber}
      `;

		if (queryResult.length === 0) {
			throw new Error(
				`User not found with phone number ${fullPhoneNumber} after creation.`,
			);
		}
		return queryResult[0] as User;
	} catch (error) {
		console.error("Error fetching user_id after creation:", error);
		throw error; // Re-throw the error to fail the test
	} finally {
		if (client) {
			closeDbClient(client);
		}
	}
}
