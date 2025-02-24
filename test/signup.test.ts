import { describe, expect, it, beforeEach, afterAll, beforeAll } from "vitest";
import { handler } from "../functions/signup-processor/index";
import { getDbClient } from "../functions/signup-processor/db";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { Client } from "pg";
import testEvent from "../events/empty-name-event.json";
import notificationPrefsEvent from "../events/notification-preferences-event.json";

describe("Signup Processor Lambda", () => {
	let client: Client;
	let event: APIGatewayProxyEvent;
	let context: Context;

	beforeAll(async () => {
		client = await getDbClient();
	});

	beforeEach(async () => {
		// Clean up both tables to ensure a fresh start
		await client.query("BEGIN");
		await client.query("DELETE FROM public.users");
		await client.query("COMMIT");

		// Reset test event for each test
		event = JSON.parse(
			JSON.stringify(testEvent),
		) as unknown as APIGatewayProxyEvent;
		context = {} as Context;
	});

	afterAll(async () => {
		// Clean up after all tests
		await client.query("BEGIN");
		await client.query("DELETE FROM public.users");
		await client.query("COMMIT");
		await client.end();
	});

	it("processes signup form submission", async () => {
		const result = await handler(event, context);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result.body).toContain("You're all set to receive notifications.");

		const dbResult = await client.query("SELECT COUNT(*) FROM public.users");
		expect(Number.parseInt(dbResult.rows[0].count)).toBe(1);
	});

	it("prevents duplicate signups", async () => {
		await handler(event, context);
		const result = await handler(event, context);

		expect(result.statusCode).toBe(409);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result.body).toContain(
			"A user with that phone number already exists.",
		);
	});

	it("uses default name when name is not provided", async () => {
		// We can use the default test event since it already has an empty name
		await handler(event, context);

		const dbResult = await client.query(
			"SELECT preferred_name FROM Users WHERE phone_number = $1",
			["(555) 555-5555"],
		);
		expect(dbResult.rows[0].preferred_name).toBe("User");
	});

	it("correctly processes notification preferences", async () => {
		const event = JSON.parse(
			JSON.stringify(notificationPrefsEvent),
		) as unknown as APIGatewayProxyEvent;
		await handler(event, context);

		const dbResult = await client.query(
			`
			SELECT daily_fullmoon, daily_nasa, daily_weather_outfit 
			FROM Notification_Preferences np 
			JOIN Users u ON np.user_id = u.user_id 
			WHERE u.phone_number = $1
		`,
			["+1234567890"],
		);

		expect(dbResult.rows[0]).toEqual({
			daily_fullmoon: true,
			daily_nasa: true,
			daily_weather_outfit: false,
		});
	});
});
