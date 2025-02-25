import {
	describe,
	expect,
	it,
	beforeEach,
	afterAll,
	beforeAll,
	vi,
} from "vitest";
import { handler } from "../functions/signup-processor/index";
import { getDbClient } from "../functions/signup-processor/db";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { Client } from "pg";

describe("Signup Processor Lambda", () => {
	let client: Client;
	let event: APIGatewayProxyEvent;
	let context: Context;
	const originalEnv = process.env.NODE_ENV;

	beforeAll(async () => {
		client = await getDbClient();
		// Ensure we're in development mode to skip Turnstile
		process.env.NODE_ENV = "development";
	});

	beforeEach(async () => {
		await client.query("BEGIN");
		await client.query("DELETE FROM public.users");
		await client.query("COMMIT");

		// Setup base event
		const formData = new URLSearchParams();
		formData.append("name", "Test User");
		formData.append("phone-number", "(555) 555-5555");
		formData.append("city", "d97ab0da-bc0b-4daf-bb7c-902dd8424f92");
		formData.append("preferredLanguage", "en");
		formData.append("unitPreference", "metric");
		formData.append("timeFormat", "24h");
		formData.append("dailyNotificationTime", "morning");
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
		formData.append("city", "NYC");
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
		formData.append("phone-number", "(555) 555-5555");
		formData.append("city", "d97ab0da-bc0b-4daf-bb7c-902dd8424f92");
		formData.append("preferredLanguage", "en");
		formData.append("unitPreference", "metric");
		formData.append("timeFormat", "24h");
		formData.append("dailyNotificationTime", "morning");
		formData.append("notifications", "fullmoon");
		formData.append("notifications", "nasa");
		formData.append("notifications", "weatherOutfit");

		event.body = Buffer.from(formData.toString()).toString("base64");
		event.isBase64Encoded = true;

		const result = await handler(event, context);
		expect(result.statusCode).toBe(200);
	});
});
