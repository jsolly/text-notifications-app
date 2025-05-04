import {
	describe,
	expect,
	it,
	beforeEach,
	afterEach,
	afterAll,
	vi,
} from "vitest";
import { handler } from "../../../backend/functions/signup-processor/index";
import {
	getDbClient,
	closeDbClient,
} from "../../../backend/functions/shared/db";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import fs from "node:fs";
import path from "node:path";
import type { PoolClient } from "pg";
import { fileURLToPath } from "node:url";
import { createAPIGatewayProxyEvent } from "./utils/lambda_utils";

// Disable console output during tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
console.error = vi.fn();
console.log = vi.fn();

const TEST_PHONE_NUMBERS = {
	DEFAULT: "(555) 555-5555",
	ALTERNATE: "(530) 268-3456",
};

const TEST_USER_DATA = {
	PREFERRED_NAME: "Test User",
	PHONE_COUNTRY_CODE: "+1",
	CITY_ID: "126104",
	PREFERRED_LANGUAGE: "en",
	UNIT_PREFERENCE: "metric",
	TIME_FORMAT: "24h",
	DAILY_NOTIFICATION_TIME: "morning",
};

const TEST_USER_NOTIFICATION_PREFERENCES = {
	CELESTIAL_EVENTS: false,
	ASTRONOMY_PHOTO_OF_THE_DAY: true,
	WEATHER_OUTFIT_SUGGESTIONS: false,
	RECIPE_SUGGESTIONS: false,
	SUNDOWN_ALERTS: false,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function signupFormData() {
	const formData = new URLSearchParams();
	formData.append("name_preference", TEST_USER_DATA.PREFERRED_NAME);
	formData.append("phone_country_code", TEST_USER_DATA.PHONE_COUNTRY_CODE);
	formData.append("phone_number", TEST_PHONE_NUMBERS.DEFAULT);
	formData.append("city_id", TEST_USER_DATA.CITY_ID);
	formData.append("language_preference", TEST_USER_DATA.PREFERRED_LANGUAGE);
	formData.append("unit_preference", TEST_USER_DATA.UNIT_PREFERENCE);
	formData.append("time_format_preference", TEST_USER_DATA.TIME_FORMAT);
	formData.append(
		"notification_time_preference",
		TEST_USER_DATA.DAILY_NOTIFICATION_TIME,
	);
	// Set each notification preference with its own parameter
	for (const key in TEST_USER_NOTIFICATION_PREFERENCES) {
		if (
			TEST_USER_NOTIFICATION_PREFERENCES[
				key as keyof typeof TEST_USER_NOTIFICATION_PREFERENCES
			]
		) {
			formData.append(key.toLowerCase(), "true");
		}
	}
	return formData;
}

describe("Signup Processor Lambda [integration]", () => {
	let client: PoolClient;
	let signup_event: APIGatewayProxyEvent;

	beforeEach(async () => {
		// Get a client from the pool for each test
		client = await getDbClient(process.env.DATABASE_URL_TEST as string);

		// Clean up the database before each test
		await client.query("DELETE FROM public.notification_preferences");
		await client.query("DELETE FROM public.users");

		const formData = signupFormData();

		signup_event = createAPIGatewayProxyEvent("/signup", "POST", "/signup", {
			body: formData.toString(),
		});
	});

	afterEach(async () => {
		await closeDbClient(client);
	});

	afterAll(async () => {
		// Restore original console functions
		console.error = originalConsoleError;
		console.log = originalConsoleLog;
	});

	it("successfully processes valid form submission [integration]", async () => {
		const result = await handler(signup_event, {} as Context);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
			"HX-Trigger": "signupResponse",
		});
		expect(result.body).toContain('id="submit_button"');
		expect(result.body).toContain('data-success="true"');
		expect(result.body).toContain("Sign Up Successful!");

		// Verify the user was created
		const userResult = await client.query(
			`SELECT * FROM public.users WHERE phone_number = '${TEST_PHONE_NUMBERS.DEFAULT}'`,
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved
		const preferencesResult = await client.query(
			`SELECT np.* 
			 FROM public.notification_preferences np
			 JOIN public.users u ON np.user_id = u.user_id
			 WHERE u.phone_number = '${TEST_PHONE_NUMBERS.DEFAULT}'`,
		);
		expect(preferencesResult.rows.length).toBe(1);

		const preferences = preferencesResult.rows[0];
		expect(preferences).toEqual(
			expect.objectContaining({
				celestial_events: false,
				astronomy_photo_of_the_day: true,
				weather_outfit_suggestions: false,
				recipe_suggestions: false,
				sunset_alerts: false,
			}),
		);
	});

	it("Handles Duplicate Phone Number [integration]", async () => {
		await handler(signup_event, {} as Context); // First call to create an initial user
		const result2 = await handler(signup_event, {} as Context);

		expect(result2.statusCode).toBe(400);
		expect(result2.headers).toEqual({
			"Content-Type": "text/html",
			"HX-Trigger": "signupResponse",
		});
		expect(result2.body).toContain('id="submit_button"');
		expect(result2.body).toContain('data-error="true"');
		expect(result2.body).toContain(
			"A user with that phone number already exists.",
		);

		// Verify only one user exists
		const userResult = await client.query(
			`SELECT * FROM public.users WHERE phone_number = '${TEST_PHONE_NUMBERS.DEFAULT}'`,
		);
		expect(userResult.rows.length).toBe(1);
	});

	it("handles base64 encoded bodies [integration]", async () => {
		const formData = signupFormData();
		formData.set("phone_number", TEST_PHONE_NUMBERS.ALTERNATE);

		const encodedEvent = { ...signup_event };
		encodedEvent.body = Buffer.from(formData.toString()).toString("base64");
		encodedEvent.isBase64Encoded = true;

		const result = await handler(encodedEvent, {} as Context);
		expect(result.statusCode).toBe(200);

		// Verify the user was created
		const userResult = await client.query(
			`SELECT * FROM public.users WHERE phone_number = '${TEST_PHONE_NUMBERS.ALTERNATE}'`,
		);
		expect(userResult.rows.length).toBe(1);
	});

	it("successfully processes real notification preferences event with all notifications on [integration]", async () => {
		// Load the real event data from the JSON file
		const eventJsonPath = path.resolve(
			__dirname,
			"../../../backend/events/signup-event-ALL-notifications-enabled.json",
		);
		const eventJson = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));

		// Use the real event data
		const realEvent = eventJson as APIGatewayProxyEvent;

		const result = await handler(realEvent, {} as Context);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
			"HX-Trigger": "signupResponse",
		});
		expect(result.body).toContain('id="submit_button"');
		expect(result.body).toContain('data-success="true"');
		expect(result.body).toContain("Sign Up Successful!");

		// Verify the user was created
		const userResult = await client.query(
			`SELECT * FROM public.users WHERE phone_number = '${TEST_PHONE_NUMBERS.ALTERNATE}'`,
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved correctly using an explicit join
		const preferencesResult = await client.query(
			`SELECT np.* 
			 FROM public.notification_preferences np
			 JOIN public.users u ON np.user_id = u.user_id
			 WHERE u.phone_number = '${TEST_PHONE_NUMBERS.ALTERNATE}'`,
		);
		expect(preferencesResult.rows.length).toBe(1);

		const preferences = preferencesResult.rows[0];
		expect(preferences).toEqual(
			expect.objectContaining({
				astronomy_photo_of_the_day: true,
				celestial_events: true,
				recipe_suggestions: true,
				weather_outfit_suggestions: true,
				sunset_alerts: true,
			}),
		);
	});

	it("successfully processes real notification preferences event with one notification on [integration]", async () => {
		// Load the real event data from the JSON file
		const eventJsonPath = path.resolve(
			__dirname,
			"../../../backend/events/signup-event-ONE-notification-enabled.json",
		);
		const eventJson = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));

		// Use the real event data
		const realEvent = eventJson as APIGatewayProxyEvent;

		const result = await handler(realEvent, {} as Context);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
			"HX-Trigger": "signupResponse",
		});
		expect(result.body).toContain('id="submit_button"');
		expect(result.body).toContain('data-success="true"');
		expect(result.body).toContain("Sign Up Successful!");

		// Verify the user was created
		const userResult = await client.query(
			`SELECT * FROM public.users WHERE phone_number = '${TEST_PHONE_NUMBERS.ALTERNATE}'`,
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved correctly - only astronomy_photo_of_the_day should be true
		const preferencesResult = await client.query(
			`SELECT np.* 
			 FROM public.notification_preferences np
			 JOIN public.users u ON np.user_id = u.user_id
			 WHERE u.phone_number = '${TEST_PHONE_NUMBERS.ALTERNATE}'`,
		);
		expect(preferencesResult.rows.length).toBe(1);

		const preferences = preferencesResult.rows[0];
		expect(preferences).toEqual(
			expect.objectContaining({
				astronomy_photo_of_the_day: true,
				celestial_events: false,
				recipe_suggestions: false,
				weather_outfit_suggestions: false,
				sunset_alerts: false,
			}),
		);
	});
});
