import { describe, expect, it, beforeEach, afterEach, afterAll } from "vitest";
import { handler } from "../../functions/signup-processor/index";
import { getDbClient, closeDbClient } from "../../functions/shared/db";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import fs from "node:fs";
import path from "node:path";
import type { PoolClient } from "pg";

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

function createBaseFormData() {
	const formData = new URLSearchParams();
	formData.append("preferred_name", TEST_USER_DATA.PREFERRED_NAME);
	formData.append("phone_country_code", TEST_USER_DATA.PHONE_COUNTRY_CODE);
	formData.append("phone_number", TEST_PHONE_NUMBERS.DEFAULT);
	formData.append("city_id", TEST_USER_DATA.CITY_ID);
	formData.append("preferred_language", TEST_USER_DATA.PREFERRED_LANGUAGE);
	formData.append("unit_preference", TEST_USER_DATA.UNIT_PREFERENCE);
	formData.append("time_format", TEST_USER_DATA.TIME_FORMAT);
	formData.append(
		"daily_notification_time",
		TEST_USER_DATA.DAILY_NOTIFICATION_TIME,
	);
	return formData;
}

describe("Signup Processor Lambda", () => {
	let client: PoolClient;
	let event: APIGatewayProxyEvent;
	let context: Context;

	beforeEach(async () => {
		// Get a client from the pool for each test
		client = await getDbClient();

		// Clean up the database before each test
		await client.query("DELETE FROM public.notification_preferences");
		await client.query("DELETE FROM public.users");

		// Setup base event
		const formData = createBaseFormData();
		formData.append("notifications", "daily_celestial_events");
		formData.append("notifications", "daily_nasa");

		event = {
			body: formData.toString(),
			headers: {
				"cf-turnstile-response": "test-token", // Add a dummy token
			},
			isBase64Encoded: false,
			requestContext: {
				identity: {
					sourceIp: "127.0.0.1",
					userAgent: "test-agent",
				},
			},
			pathParameters: null,
			queryStringParameters: null,
			multiValueQueryStringParameters: null,
			stageVariables: null,
			httpMethod: "POST",
			path: "/signup",
			resource: "/signup",
		} as unknown as APIGatewayProxyEvent;

		context = {} as Context;
	});

	afterEach(async () => {
		// Close the client after each test
		await closeDbClient(client);
	});

	afterAll(async () => {
		// Clean up test data with a temporary client
		const cleanupClient = await getDbClient();

		try {
			await cleanupClient.query("DELETE FROM public.notification_preferences");
			await cleanupClient.query("DELETE FROM public.users");
		} finally {
			await closeDbClient(cleanupClient);
		}
	});

	it("successfully processes valid form submission", async () => {
		const result = await handler(event, context);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result.body).toContain("Signup Successful!");

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
				daily_celestial_events: true,
				daily_nasa: true,
				daily_weather_outfit: false,
				daily_recipe: false,
				instant_sunset: false,
			}),
		);
	});

	it("Handles Duplicate Phone Number", async () => {
		await handler(event, context); // First call to create an initial user
		const result2 = await handler(event, context);

		expect(result2.statusCode).toBe(400);
		expect(result2.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result2.body).toContain(
			"A user with that phone number already exists.",
		);

		// Verify only one user exists
		const userResult = await client.query(
			`SELECT * FROM public.users WHERE phone_number = '${TEST_PHONE_NUMBERS.DEFAULT}'`,
		);
		expect(userResult.rows.length).toBe(1);
	});

	it("handles base64 encoded bodies", async () => {
		const formData = createBaseFormData();
		formData.set("phone_number", TEST_PHONE_NUMBERS.ALTERNATE);

		event.body = Buffer.from(formData.toString()).toString("base64");
		event.isBase64Encoded = true;

		const result = await handler(event, context);
		expect(result.statusCode).toBe(200);

		// Verify the user was created
		const userResult = await client.query(
			`SELECT * FROM public.users WHERE phone_number = '${TEST_PHONE_NUMBERS.ALTERNATE}'`,
		);
		expect(userResult.rows.length).toBe(1);
	});

	it("successfully processes real notification preferences event", async () => {
		// Load the real event data from the JSON file
		// Determine if we're in the root directory or the backend directory
		const isInRoot = process.cwd().endsWith("text-notifications-app");
		const eventJsonPath = path.resolve(
			process.cwd(),
			isInRoot
				? "backend/events/notification-preferences-event.json"
				: "events/notification-preferences-event.json",
		);
		const eventJson = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));

		// Use the real event data
		const realEvent = eventJson as APIGatewayProxyEvent;

		const result = await handler(realEvent, context);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result.body).toContain("Signup Successful!");

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
				daily_celestial_events: true,
				daily_recipe: true,
				daily_weather_outfit: true,
				instant_sunset: true,
			}),
		);
	});
});
