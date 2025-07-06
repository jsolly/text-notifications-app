import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { handler } from "../../../backend/functions/signup-processor/index.js";
import {
	getDbClient,
	closeDbClient,
} from "../../../backend/functions/shared/db.js";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import fs from "node:fs";
import path from "node:path";
import type { PoolClient } from "pg";
import { fileURLToPath } from "node:url";
import { createAPIGatewayProxyEvent } from "./utils/lambda-utils.js";
import { generateSignupFormData } from "./utils/function-utils.js";
const TEST_PHONE_NUMBERS = {
	SUCCESSFUL: "5005550006",
	FAILURE: "5005550009",
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Signup Processor Lambda [integration]", () => {
	let client: PoolClient;
	let signup_event: APIGatewayProxyEvent;

	beforeEach(async () => {
		// Get a client from the pool for each test
		client = await getDbClient(process.env.DATABASE_URL_TEST as string);

		// Clean up the database before each test
		await client.query("DELETE FROM public.notification_preferences");
		await client.query("DELETE FROM public.users");

		const formData = generateSignupFormData();

		signup_event = createAPIGatewayProxyEvent("/signup", "POST", "/signup", {
			body: formData.toString(),
		});
	});

	afterEach(async () => {
		await closeDbClient(client);
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
			"SELECT * FROM public.users WHERE phone_number = $1",
			[TEST_PHONE_NUMBERS.SUCCESSFUL],
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved
		const preferencesResult = await client.query(
			"SELECT np.* " +
				"FROM public.notification_preferences np " +
				"JOIN public.users u ON np.user_id = u.id " +
				"WHERE u.phone_number = $1",
			[TEST_PHONE_NUMBERS.SUCCESSFUL],
		);
		expect(preferencesResult.rows.length).toBe(1);

		const preferences = preferencesResult.rows[0];
		expect(preferences).toEqual(
			expect.objectContaining({
				weather: false,
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
			"SELECT * FROM public.users WHERE phone_number = $1",
			[TEST_PHONE_NUMBERS.SUCCESSFUL],
		);
		expect(userResult.rows.length).toBe(1);
	});

	it("handles base64 encoded bodies [integration]", async () => {
		const formData = generateSignupFormData();
		formData.set("phone_number", TEST_PHONE_NUMBERS.FAILURE);

		const encodedEvent = { ...signup_event };
		encodedEvent.body = Buffer.from(formData.toString()).toString("base64");
		encodedEvent.isBase64Encoded = true;

		const result = await handler(encodedEvent, {} as Context);
		expect(result.statusCode).toBe(200);

		// Verify the user was created
		const userResult = await client.query(
			"SELECT * FROM public.users WHERE phone_number = $1",
			[TEST_PHONE_NUMBERS.FAILURE],
		);
		expect(userResult.rows.length).toBe(1);
	});

	it("successfully processes a real notification preference event [integration]", async () => {
		// Load the real event data from the JSON file
		const eventJsonPath = path.resolve(
			__dirname,
			"../../../backend/events/signup.json",
		);
		const eventJson = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));

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
			"SELECT * FROM public.users WHERE phone_number = $1",
			[TEST_PHONE_NUMBERS.SUCCESSFUL],
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved correctly using an explicit join
		const preferencesResult = await client.query(
			"SELECT np.* " +
				"FROM public.notification_preferences np " +
				"JOIN public.users u ON np.user_id = u.id " +
				"WHERE u.phone_number = $1",
			[TEST_PHONE_NUMBERS.SUCCESSFUL],
		);
		expect(preferencesResult.rows.length).toBe(1);

		const preferences = preferencesResult.rows[0];
		expect(preferences).toEqual(
			expect.objectContaining({
				weather: true,
			}),
		);
	});
});
