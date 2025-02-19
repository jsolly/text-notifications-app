import { describe, expect, it, beforeEach, afterAll, beforeAll } from "vitest";
import { lambdaHandler } from "../functions/signup-processor/index";
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
		await client.query("DELETE FROM public.users");

		// Reset test event for each test
		event = JSON.parse(
			JSON.stringify(testEvent),
		) as unknown as APIGatewayProxyEvent;
		context = {} as Context;
	});

	afterAll(async () => {
		await client.end();
	});

	it("processes signup form submission", async () => {
		const result = await lambdaHandler(event, context, client);

		expect(result.statusCode).toBe(200);
		expect(result.headers).toEqual({
			"Content-Type": "text/html",
		});
		expect(result.body).toContain("You're all set to receive notifications.");

		const dbResult = await client.query("SELECT COUNT(*) FROM public.users");
		expect(Number.parseInt(dbResult.rows[0].count)).toBe(1);
	});

	it("prevents duplicate signups", async () => {
		await lambdaHandler(event, context, client);
		const result = await lambdaHandler(event, context, client);

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
		await lambdaHandler(event, context, client);

		const dbResult = await client.query(
			"SELECT preferred_name FROM Users WHERE phone_number = $1",
			["(555) 555-5555"],
		);
		expect(dbResult.rows[0].preferred_name).toBe("Friend");
	});

	it("correctly processes notification preferences", async () => {
		const event = JSON.parse(
			JSON.stringify(notificationPrefsEvent),
		) as unknown as APIGatewayProxyEvent;
		await lambdaHandler(event, context, client);

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
