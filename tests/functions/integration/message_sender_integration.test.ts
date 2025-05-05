import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { handler } from "../../../backend/functions/message_sender/index";
import {
	getDbClient,
	closeDbClient,
} from "../../../backend/functions/shared/db";
import type { Context, EventBridgeEvent } from "aws-lambda";
import type { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import { createScheduledEvent } from "./utils/lambda_utils";

// Mock Twilio client messages create function
const mockMessagesCreate = vi.fn().mockResolvedValue({
	sid: "TEST_MESSAGE_SID_123456",
});

// Create Twilio constructor mock
vi.mock("twilio", () => {
	return {
		default: vi.fn(() => ({
			messages: {
				create: mockMessagesCreate,
			},
		})),
	};
});

// Disable console output during tests
const originalConsoleLog = console.log;
console.log = vi.fn();

describe("Message Sender Lambda [integration]", () => {
	let client: PoolClient;
	let testUserId: string;

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

		// Generate a UUID directly rather than relying on uuid_generate_v4() function
		testUserId = uuidv4();

		// Insert test user with the generated UUID
		await client.query(
			`
      INSERT INTO users (
        user_id, 
        name_preference, 
        phone_number, 
        phone_country_code,
        language_preference, 
        unit_preference,
        time_format_preference,
        notification_time_preference,
        is_active, 
        utc_notification_time,
        city_id
      ) VALUES (
        $1, 
        'Test User', 
        '5555555555', 
        '+1',
        'en', 
        'imperial',
        '12h',
        'morning',
        true, 
        $2,
        '126104'
      )
    `,
			[testUserId, notificationTime],
		);

		// Insert test notification preferences with the explicitly provided user_id
		await client.query(
			`
      INSERT INTO notification_preferences (
        user_id, 
        astronomy_photo_of_the_day, 
        celestial_events, 
        weather_outfit_suggestions, 
        recipe_suggestions, 
        sunset_alerts
      ) VALUES (
        $1, 
        true, 
        false, 
        false, 
        false, 
        false
      )
    `,
			[testUserId],
		);

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
      ON CONFLICT (date) DO NOTHING
    `);
	});

	afterEach(async () => {
		await closeDbClient(client);
	});

	it("successfully sends and logs notifications [integration]", async () => {
		// Reset mock before test
		mockMessagesCreate.mockClear();

		// Create test event with EventBridge structure
		const event = createScheduledEvent({
			time: "2023-09-15T12:00:00Z",
			resources: [
				"arn:aws:events:us-east-1:123456789012:rule/HourlyMessageSender",
			],
		});

		const context = {} as Context;

		// Call the handler function
		const result = await handler(event, context);

		// Verify the result
		expect(result.statusCode).toBe(200);
		const responseBody =
			typeof result.body === "string" ? JSON.parse(result.body) : result.body;

		// The handler could return either a notification confirmation or "No users to notify"
		// Both are valid responses depending on whether users were found for the current hour
		if (responseBody.message === "No users to notify") {
			// If no users to notify, there should be no Twilio calls or database entries
			expect(mockMessagesCreate).not.toHaveBeenCalled();

			// Check that no entries were added to the log
			const logs = await client.query(
				"SELECT * FROM notifications_log WHERE user_id = $1",
				[testUserId],
			);
			expect(logs.rows.length).toBe(0);
		} else {
			// If notifications were sent
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
				"SELECT * FROM notifications_log WHERE user_id = $1",
				[testUserId],
			);

			expect(logs.rows.length).toBe(1);
			const log = logs.rows[0];

			expect(log.user_id).toBeDefined();
			expect(log.notification_type).toBe("astronomy_photo_of_the_day");
			expect(log.delivery_status).toBe("sent");
			expect(log.response_message).toBe("TEST_MESSAGE_SID_123456");
		}
	});
});
