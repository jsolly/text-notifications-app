import {
	describe,
	expect,
	it,
	beforeEach,
	afterAll,
	beforeAll,
	afterEach,
} from "vitest";
import { handler } from "../../functions/signup-processor/index";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

describe("Signup Processor Lambda", () => {
	let client: Client;
	let event: APIGatewayProxyEvent;
	let context: Context;
	const originalEnv = process.env.NODE_ENV;

	beforeAll(() => {
		// Ensure we're in development mode to skip Turnstile
		process.env.NODE_ENV = "development";
	});

	beforeEach(async () => {
		// Create a new client for each test
		client = new Client({
			connectionString: process.env.DATABASE_URL,
		});
		await client.connect();

		// Clean up the database before each test
		await client.query("DELETE FROM public.notification_preferences");
		await client.query("DELETE FROM public.users");

		// Setup base event
		const formData = new URLSearchParams();
		formData.append("preferred_name", "Test User");
		formData.append("phone_country_code", "+1");
		formData.append("phone_number", "(555) 555-5555");
		formData.append("city_id", "126104");
		formData.append("preferred_language", "en");
		formData.append("unit_preference", "metric");
		formData.append("time_format", "24h");
		formData.append("daily_notification_time", "morning");
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
		await client.end();
	});

	afterAll(async () => {
		// Clean up test data with a temporary client
		const cleanupClient = new Client({
			connectionString: process.env.DATABASE_URL,
		});
		await cleanupClient.connect();

		try {
			await cleanupClient.query("DELETE FROM public.notification_preferences");
			await cleanupClient.query("DELETE FROM public.users");
		} finally {
			await cleanupClient.end();
		}

		// Restore original environment
		process.env.NODE_ENV = originalEnv;
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
			"SELECT * FROM public.users WHERE phone_number = '(555) 555-5555'",
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved
		const preferencesResult = await client.query(
			`SELECT np.* 
			 FROM public.notification_preferences np
			 JOIN public.users u ON np.user_id = u.user_id
			 WHERE u.phone_number = '(555) 555-5555'`,
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
			"SELECT * FROM public.users WHERE phone_number = '(555) 555-5555'",
		);
		expect(userResult.rows.length).toBe(1);
	});

	it("handles base64 encoded bodies", async () => {
		const formData = new URLSearchParams();
		formData.append("preferred_name", "Test User");
		formData.append("phone_country_code", "+1");
		formData.append("phone_number", "(530) 268-3456");
		formData.append("city_id", "126104");
		formData.append("preferred_language", "en");
		formData.append("unit_preference", "metric");
		formData.append("time_format", "24h");
		formData.append("daily_notification_time", "morning");

		event.body = Buffer.from(formData.toString()).toString("base64");
		event.isBase64Encoded = true;

		const result = await handler(event, context);
		expect(result.statusCode).toBe(200);

		// Verify the user was created
		const userResult = await client.query(
			"SELECT * FROM public.users WHERE phone_number = '(530) 268-3456'",
		);
		expect(userResult.rows.length).toBe(1);
	});

	it("successfully processes real notification preferences event", async () => {
		// Load the real event data from the JSON file
		const eventJsonPath = path.resolve(
			process.cwd(),
			"backend/events/notification-preferences-event.json",
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
			"SELECT * FROM public.users WHERE phone_number = '(530) 268-3456'",
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved correctly using an explicit join
		const preferencesResult = await client.query(
			`SELECT np.* 
			 FROM public.notification_preferences np
			 JOIN public.users u ON np.user_id = u.user_id
			 WHERE u.phone_number = '(530) 268-3456'`,
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
