import { describe, expect, it, beforeEach, afterAll, beforeAll } from "vitest";
import { handler } from "../index";
import { getDbClient } from "../db";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

/**
 * Helper function to create a sample city for testing
 * @param client - PostgreSQL client
 * @returns Promise that resolves when the city is created
 */
const createSampleCity = async (client: Client): Promise<void> => {
	console.log("Creating Seattle as sample city for tests");
	try {
		await client.query(
			`INSERT INTO public.cities (
				id, name, state_id, state_code, country_id, country_code,
				latitude, longitude, timezone, active
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
			)`,
			[
				126104, // id
				"Seattle", // name
				1462, // state_id
				"WA", // state_code
				233, // country_id
				"US", // country_code
				47.60621, // latitude
				-122.33207, // longitude
				"America/Los_Angeles", // timezone
				true, // active
			],
		);
		console.log("Sample city created successfully");
	} catch (error) {
		console.error("Error creating sample city:", error);
		throw error;
	}
};

describe("Signup Processor Lambda", () => {
	let client: Client;
	let event: APIGatewayProxyEvent;
	let context: Context;
	const originalEnv = process.env.NODE_ENV;

	beforeAll(async () => {
		client = await getDbClient();
		// Ensure we're in development mode to skip Turnstile
		process.env.NODE_ENV = "development";

		// Create the test city
		await client.query("BEGIN");
		// Clean up any existing data first
		await client.query("DELETE FROM public.cities WHERE id = 126104");
		await createSampleCity(client);
		await client.query("COMMIT");
	});

	beforeEach(async () => {
		await client.query("BEGIN");
		await client.query("DELETE FROM public.users");
		await client.query("COMMIT");

		// Setup base event
		const formData = new URLSearchParams();
		formData.append("name", "Test User");
		formData.append("phone-country-code", "+1");
		formData.append("phone-number", "(555) 555-5555");
		formData.append("city", "126104");
		formData.append("preferred-language", "en");
		formData.append("unit-preference", "metric");
		formData.append("time-format", "24h");
		formData.append("daily-notification-time", "morning");
		formData.append("notifications", "fullmoon");
		formData.append("notifications", "nasa");

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

	afterAll(async () => {
		await client.query("BEGIN");
		await client.query("DELETE FROM public.users");
		// Also clean up the test city
		await client.query("DELETE FROM public.cities WHERE id = 126104");
		await client.query("COMMIT");
		await client.end();
		// Restore original environment
		process.env.NODE_ENV = originalEnv;
	});

	it("successfully processes valid form submission", async () => {
		const result = await handler(event, context);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result.body).toContain("Sign Up Successful!");
	});

	it("Handles Duplicate Phone Number", async () => {
		await handler(event, context); // First call to create an initial user
		const result2 = await handler(event, context);

		expect(result2.statusCode).toBe(409);
		expect(result2.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result2.body).toContain(
			"A user with that phone number already exists.",
		);
	});

	it("handles missing required fields", async () => {
		const formData = new URLSearchParams();
		formData.append("name", "Test User");
		formData.append("city", "126104");
		event.body = formData.toString();

		const result = await handler(event, context);

		expect(result.statusCode).toBe(500);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result.body).toContain("Phone number is required");
	});

	it("handles missing form data", async () => {
		const emptyEvent = {
			...event,
			body: null,
		};
		const result = await handler(emptyEvent, context);

		expect(result.statusCode).toBe(500);
		expect(result.body).toContain("No form data received in request body");
	});
	it("handles base64 encoded bodies", async () => {
		const formData = new URLSearchParams();
		formData.append("name", "Test User");
		formData.append("phone-country-code", "+1");
		formData.append("phone-number", "(530) 268-3456");
		formData.append("city", "126104");
		formData.append("preferred-language", "en");
		formData.append("unit-preference", "metric");
		formData.append("time-format", "24h");
		formData.append("daily-notification-time", "morning");

		event.body = Buffer.from(formData.toString()).toString("base64");
		event.isBase64Encoded = true;

		const result = await handler(event, context);
		expect(result.statusCode).toBe(200);
	});

	it("successfully processes real notification preferences event", async () => {
		// Load the real event data from the JSON file
		const eventJsonPath = path.resolve(
			__dirname,
			"../../../events/notification-preferences-event.json",
		);
		const eventJson = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));

		// Use the real event data
		const realEvent = eventJson as APIGatewayProxyEvent;

		const result = await handler(realEvent, context);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result.body).toContain("Sign Up Successful!");

		// Verify the user was created
		const userResult = await client.query(
			"SELECT * FROM public.users WHERE full_phone = '+1(530) 268-3456'",
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved correctly using an explicit join
		const preferencesResult = await client.query(
			`SELECT np.* 
			 FROM public.notification_preferences np
			 JOIN public.users u ON np.user_id = u.user_id
			 WHERE u.full_phone = '+1(530) 268-3456'`,
		);
		expect(preferencesResult.rows.length).toBe(1);

		const preferences = preferencesResult.rows[0];
		expect(preferences).toEqual(
			expect.objectContaining({
				daily_fullmoon: true,
				daily_nasa: true,
				daily_weather_outfit: true,
				daily_recipe: true,
				instant_sunset: true,
			}),
		);
	});
});
