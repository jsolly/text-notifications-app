import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { handler } from "../../../backend/functions/message_sender/index";
import {
	getDbClient,
	closeDbClient,
} from "../../../backend/functions/shared/db";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import type { PoolClient } from "pg";

vi.mock("twilio", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			messages: {
				create: vi.fn().mockResolvedValue({
					sid: "TEST_MESSAGE_SID_123456",
				}),
			},
		})),
	};
});

// Disable console output during tests
const originalConsoleLog = console.log;
console.log = vi.fn();

describe("Message Sender Lambda [integration]", () => {
	let client: PoolClient;

	beforeEach(async () => {
		// Get a client from the pool for each test
		client = await getDbClient(process.env.DATABASE_URL_TEST as string);

		// Clean up test data
		await client.query("DELETE FROM notifications_log");
		await client.query("DELETE FROM notification_preferences");
		await client.query("DELETE FROM users");

		// Setup test time - set to 1 minute from now to ensure it falls in current hour window
		const now = new Date();
		const testTime = new Date(now);
		// Set seconds and milliseconds to 0
		testTime.setUTCSeconds(0, 0);
		// Add 1 minute
		testTime.setUTCMinutes(testTime.getUTCMinutes() + 1);

		const notificationTime = `${testTime.getUTCHours().toString().padStart(2, "0")}:${testTime.getUTCMinutes().toString().padStart(2, "0")}:00`;

		// Insert test user
		await client.query(
			`
      INSERT INTO users (
        user_id, 
        name_preference, 
        phone_number, 
        full_phone, 
        language_preference, 
        is_active, 
        utc_notification_time,
        city_id
      ) VALUES (
        'test-user-001', 
        'Test User', 
        '5555555555', 
        '+15555555555', 
        'en', 
        true, 
        $1,
        '126104'
      )
    `,
			[notificationTime],
		);

		// Insert test notification preferences
		await client.query(`
      INSERT INTO notification_preferences (
        user_id, 
        astronomy_photo_of_the_day, 
        celestial_events, 
        weather_outfit_suggestions, 
        recipe_suggestions, 
        sunset_alerts
      ) VALUES (
        'test-user-001', 
        true, 
        false, 
        false, 
        false, 
        false
      )
    `);

		// Insert sample NASA APOD data
		await client.query(`
      INSERT INTO NASA_APOD (
        date,
        title,
        explanation,
        original_url,
        media_type,
        s3_object_id
      ) VALUES (
        CURRENT_DATE,
        'Test NASA Image',
        'This is a test explanation for the NASA image of the day',
        'https://example.com/test-image.jpg',
        'image',
        'nasa-apod/test-image.jpg'
      )
    `);
	});

	afterEach(async () => {
		await closeDbClient(client);
	});

	it("successfully sends and logs notifications [integration]", async () => {
		// Get mockTwilio from our mock implementation
		const twilioMock = require("twilio").default;
		const mockMessagesCreate = twilioMock().messages.create;

		// Create test event
		const event: APIGatewayProxyEvent = {
			version: "0",
			id: "7ecf3a42-8deb-455b-b39e-f27dae983f25",
			"detail-type": "Scheduled Event",
			source: "aws.events",
			account: "123456789012",
			time: "2023-09-15T12:00:00Z",
			region: "us-east-1",
			resources: [
				"arn:aws:events:us-east-1:123456789012:rule/HourlyMessageSender",
			],
			detail: {},
		} as unknown as APIGatewayProxyEvent;

		const context = {} as Context;

		// Call the handler function
		const result = await handler(event, context);

		// Verify the result
		expect(result.statusCode).toBe(200);
		const responseBody =
			typeof result.body === "string" ? JSON.parse(result.body) : result.body;
		expect(responseBody.message).toContain("notifications");

		// Verify Twilio was called with correct parameters
		expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
		const callArgs = mockMessagesCreate.mock.calls[0][0];
		expect(callArgs.to).toBe("+15555555555");
		expect(callArgs.body).toContain("NASA's Astronomy Picture of the Day");
		expect(callArgs.body).toContain("Test NASA Image");
		expect(callArgs.body).toContain("Test User");
		expect(callArgs.mediaUrl).toEqual(["https://example.com/test-image.jpg"]);

		// Verify notification was logged to database
		const logs = await client.query(
			"SELECT * FROM notifications_log WHERE user_id = 'test-user-001'",
		);

		expect(logs.rows.length).toBe(1);
		const log = logs.rows[0];

		expect(log.user_id).toBe("test-user-001");
		expect(log.notification_type).toBe("astronomy_photo_of_the_day");
		expect(log.delivery_status).toBe("sent");
		expect(log.response_message).toBe("TEST_MESSAGE_SID_123456");
	});
});
