import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	closeDbClient,
	getDbClient,
} from "../../../backend/functions/shared/db.js";
import { handler } from "../../../backend/functions/signup-processor/index.js";
import { generateSignupFormData } from "./utils/function-utils.js";
import { createAPIGatewayProxyEvent } from "./utils/lambda-utils.js";

const TEST_PHONE_NUMBERS = {
	SIGNUP_FORM_SUCCESS: "5005550020",
	SIGNUP_DUPLICATE_CHECK: "5005550021",
	SIGNUP_BASE64_SUCCESS: "5005550022",
	SIGNUP_INVALID_FORMAT_FAILURE: "123", // Intentionally invalid format
	TWILIO_SMS_SUCCESS: "5005550006", // For testing actual Twilio SMS success
	TWILIO_SMS_FAILURE: "5005550009", // For testing actual Twilio SMS failure
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Signup Processor Lambda [integration]", () => {
	let client: PoolClient;
	let _signup_event: APIGatewayProxyEvent;

	beforeEach(async () => {
		client = await getDbClient(process.env.DATABASE_URL_TEST as string);
		// Clean up tables before each test in this suite
		// Use DELETE instead of TRUNCATE to avoid cascade issues and concurrent test conflicts
		await client.query("DELETE FROM notifications_log");
		await client.query("DELETE FROM notification_preferences");
		await client.query("DELETE FROM users");

		const formData = generateSignupFormData();

		_signup_event = createAPIGatewayProxyEvent("/signup", "POST", "/signup", {
			body: formData.toString(),
		});
	});

	afterEach(async () => {
		// Clean up after each test
		await client.query("DELETE FROM notifications_log");
		await client.query("DELETE FROM notification_preferences");
		await client.query("DELETE FROM users");
		await closeDbClient(client);
	});

	it("successfully processes valid form submission [integration]", async () => {
		const formData = generateSignupFormData();
		formData.set("phone_number", TEST_PHONE_NUMBERS.SIGNUP_FORM_SUCCESS);
		const test_event = createAPIGatewayProxyEvent(
			"/signup",
			"POST",
			"/signup",
			{
				body: formData.toString(),
			},
		);

		const result = await handler(test_event, {} as Context);

		expect(result.statusCode).toBe(201);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
			"HX-Trigger": "signupResponse",
		});
		expect(result.body).toContain('id="submit_button"');
		expect(result.body).toContain('data-success="true"');
		expect(result.body).toContain("Sign Up Successful!");

		// Verify the user was created
		const currentFormData = new URLSearchParams(test_event.body || "");
		const fullPhoneNumberForTest =
			(currentFormData.get("phone_country_code") || "") +
			(currentFormData.get("phone_number") || "");
		const userResult = await client.query(
			"SELECT * FROM public.users WHERE full_phone = $1",
			[fullPhoneNumberForTest],
		);
		expect(userResult.rows.length).toBe(1);

		// Verify notification preferences were saved
		const preferencesResult = await client.query(
			"SELECT np.* " +
				"FROM public.notification_preferences np " +
				"JOIN public.users u ON np.user_id = u.id " +
				"WHERE u.full_phone = $1",
			[fullPhoneNumberForTest],
		);
		expect(preferencesResult.rows.length).toBe(1);

		const preferences = preferencesResult.rows[0];
		expect(preferences).toEqual(
			expect.objectContaining({
				celestial_events: false,
				astronomy_photo: true,
				weather_outfits: false,
				recipes: false,
				sunset_alerts: false,
			}),
		);
	});

	it("Handles Duplicate Phone Number [integration]", async () => {
		const formData = generateSignupFormData();
		formData.set("phone_number", TEST_PHONE_NUMBERS.SIGNUP_DUPLICATE_CHECK);
		const test_event = createAPIGatewayProxyEvent(
			"/signup",
			"POST",
			"/signup",
			{
				body: formData.toString(),
			},
		);

		await handler(test_event, {} as Context); // First call
		const result2 = await handler(test_event, {} as Context); // Second call

		expect(result2.statusCode).toBe(409);
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
		const currentFormData = new URLSearchParams(test_event.body || "");
		const duplicateTestFullPhoneNumber =
			(currentFormData.get("phone_country_code") || "") +
			(currentFormData.get("phone_number") || "");
		const userResultAfterDuplicate = await client.query(
			"SELECT * FROM public.users WHERE full_phone = $1",
			[duplicateTestFullPhoneNumber],
		);
		expect(userResultAfterDuplicate.rows.length).toBe(1);
	});

	it("handles base64 encoded bodies [integration]", async () => {
		const formDataForBase64 = generateSignupFormData();
		formDataForBase64.set(
			"phone_number",
			TEST_PHONE_NUMBERS.SIGNUP_BASE64_SUCCESS,
		); // Use a dedicated number

		const encodedEvent = createAPIGatewayProxyEvent(
			"/signup",
			"POST",
			"/signup",
			{
				body: Buffer.from(formDataForBase64.toString()).toString("base64"),
				isBase64Encoded: true,
			},
		);

		const result = await handler(encodedEvent, {} as Context);
		expect(result.statusCode).toBe(201);

		// Verify the user was created
		const base64FullPhoneNumber =
			(formDataForBase64.get("phone_country_code") || "") +
			(formDataForBase64.get("phone_number") || "");
		const userResultBase64 = await client.query(
			"SELECT * FROM public.users WHERE full_phone = $1",
			[base64FullPhoneNumber],
		);
		expect(userResultBase64.rows.length).toBe(1);
	});

	it("successfully processes a real signup event [integration]", async () => {
		// Load the real event data from the JSON file
		const eventJsonPath = path.resolve(
			__dirname,
			"../../../backend/events/signup.json",
		);
		const eventJson = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));

		const realEvent = eventJson as APIGatewayProxyEvent;

		const result = await handler(realEvent, {} as Context);

		expect(result.statusCode).toBe(201);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
			"HX-Trigger": "signupResponse",
		});
		expect(result.body).toContain('id="submit_button"');
		expect(result.body).toContain('data-success="true"');
		expect(result.body).toContain("Sign Up Successful!");

		// Verify the user was created
		const realEventFormData = new URLSearchParams(
			decodeURIComponent(realEvent.body || ""),
		);

		// DEBUG LOGS
		let countryCode = (
			realEventFormData.get("phone_country_code") || ""
		).trim();
		const number = (realEventFormData.get("phone_number") || "").trim();
		console.log("DEBUG: Raw country code (trimmed):", `'${countryCode}'`);
		console.log("DEBUG: Raw phone number (trimmed):", `'${number}'`);

		// Ensure countryCode starts with + if it's purely numeric or was the space-prefixed one
		if (countryCode && !countryCode.startsWith("+")) {
			countryCode = `+${countryCode}`;
		}

		const realEventFullPhoneNumber = countryCode + number;

		console.log(
			"DEBUG: Querying for realEventFullPhoneNumber:",
			realEventFullPhoneNumber,
		);

		const userResultReal = await client.query(
			"SELECT * FROM public.users WHERE full_phone = $1",
			[realEventFullPhoneNumber],
		);
		expect(userResultReal.rows.length).toBe(1);

		// Verify notification preferences were saved correctly using an explicit join
		const preferencesResult = await client.query(
			"SELECT np.* " +
				"FROM public.notification_preferences np " +
				"JOIN public.users u ON np.user_id = u.id " +
				"WHERE u.full_phone = $1",
			[realEventFullPhoneNumber],
		);
		expect(preferencesResult.rows.length).toBe(1);

		const preferences = preferencesResult.rows[0];
		expect(preferences).toEqual(
			expect.objectContaining({
				astronomy_photo: true,
				celestial_events: true,
				recipes: true,
				weather_outfits: true,
				sunset_alerts: true,
			}),
		);
	});
});
