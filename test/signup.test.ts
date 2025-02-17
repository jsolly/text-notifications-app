import { describe, expect, it, beforeEach } from "vitest";
import { lambdaHandler } from "../functions/signup-processor/index";
import { getDbClient } from "../functions/signup-processor/db";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import testEvent from "../events/test-event.json";

async function clearDatabase() {
	const client = await getDbClient();
	try {
		await client.query("DELETE FROM Users");
	} finally {
		await client.end();
	}
}

describe("Signup Processor Lambda", () => {
	beforeEach(async () => {
		await clearDatabase();
	});

	it("processes signup form submission", async () => {
		const event = testEvent as unknown as APIGatewayProxyEvent;
		const context = {} as Context;

		const result = await lambdaHandler(event, context);
		expect(result.statusCode).toBe(200);

		// Response is actually HTML
		expect(result.body).toContain("Sign-up successful!");
	});

	it("Prevents duplicate signups", async () => {
		const event = testEvent as unknown as APIGatewayProxyEvent;
		const context = {} as Context;

		// First signup should succeed
		const firstResult = await lambdaHandler(event, context);
		expect(firstResult.statusCode).toBe(200);

		// Second signup with same data should fail
		const secondResult = await lambdaHandler(event, context);
		expect(secondResult.statusCode).toBe(409);
		expect(secondResult.body).toContain(
			"A user with that phone number already exists.",
		);
	});

	it("uses default name when name is not provided", async () => {
		const formData = new URLSearchParams();
		formData.append("phone-number", "+1234567890");
		formData.append("city", "3598527a-4718-4b50-98cb-76ef795c4c41");
		formData.append("preferredLanguage", "en");
		formData.append("unitPreference", "metric");
		formData.append("timeFormat", "24h");
		formData.append("dailyNotificationTime", "morning");

		const event = {
			body: formData.toString(),
		} as unknown as APIGatewayProxyEvent;
		const context = {} as Context;

		const result = await lambdaHandler(event, context);
		expect(result.statusCode).toBe(200);

		// Verify in database that name defaulted to "Friend"
		const client = await getDbClient();
		try {
			const dbResult = await client.query(
				"SELECT preferred_name FROM Users WHERE phone_number = $1",
				["+1234567890"],
			);
			expect(dbResult.rows[0].preferred_name).toBe("Friend");
		} finally {
			await client.end();
		}
	});

	it("correctly processes notification preferences", async () => {
		const formData = new URLSearchParams();
		formData.append("name", "Test User");
		formData.append("phone-number", "+1234567890");
		formData.append("city", "3598527a-4718-4b50-98cb-76ef795c4c41");
		formData.append("preferredLanguage", "en");
		formData.append("unitPreference", "metric");
		formData.append("timeFormat", "24h");
		formData.append("dailyNotificationTime", "morning");
		formData.append("notifications", "fullmoon");
		formData.append("notifications", "nasa");

		const event = {
			body: formData.toString(),
		} as unknown as APIGatewayProxyEvent;
		const context = {} as Context;

		const result = await lambdaHandler(event, context);
		expect(result.statusCode).toBe(200);

		// Verify notification preferences in database
		const client = await getDbClient();
		try {
			const dbResult = await client.query(
				"SELECT daily_fullmoon, daily_nasa, daily_weather_outfit FROM Notification_Preferences np JOIN Users u ON np.user_id = u.user_id WHERE u.phone_number = $1",
				["+1234567890"],
			);
			expect(dbResult.rows[0].daily_fullmoon).toBe(true);
			expect(dbResult.rows[0].daily_nasa).toBe(true);
			expect(dbResult.rows[0].daily_weather_outfit).toBe(false);
		} finally {
			await client.end();
		}
	});
});
