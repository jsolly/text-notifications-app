import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { handler } from "../../../backend/functions/message-sender/index.js";
import type { NotificationResult as HandlerResultItem } from "../../../backend/functions/message-sender/index.js";
import {
	getDbClient,
	closeDbClient,
} from "../../../backend/functions/shared/db.js";
import type { Context, EventBridgeEvent } from "aws-lambda";
import type { PoolClient } from "pg";
import { createEventBridgeEvent } from "./utils/lambda-utils.js";
import { createTestUser, } from "./utils/function-utils.js";
import type { User } from "../../../backend/functions/shared/db.js";

describe("Message Sender Lambda [integration]", () => {
	let client: PoolClient;
	let messageSenderEvent: EventBridgeEvent<
		"Scheduled Event",
		Record<string, unknown>
	>;
	let noMessageSenderEvent: EventBridgeEvent<
		"Scheduled Event",
		Record<string, unknown>
	>;
	let testUser: User;
	let failTestUser: User;

	beforeEach(async () => {
		// Get a client from the pool for each test for assertions or direct DB interaction if needed
		client = await getDbClient(process.env.DATABASE_URL_TEST as string);

		// Clean up tables before each test in this suite to ensure a clean slate
		await client.query("DELETE FROM notifications_log");
		await client.query("DELETE FROM notification_preferences");
		await client.query("DELETE FROM users");

		// Create test users
		testUser = await createTestUser();
		failTestUser = await createTestUser({ failureNumber: true });

		// A time we expect to have users scheduled
		messageSenderEvent = createEventBridgeEvent({
			time: "2023-09-15T12:00:00Z",
			resources: [
				"arn:aws:events:us-east-1:123456789012:rule/HourlyMessageSender",
			],
		});

		// A time we expect to have no users scheduled
		noMessageSenderEvent = createEventBridgeEvent({
			time: "2023-09-15T12:00:00Z",
			resources: [
				"arn:aws:events:us-east-1:123456789012:rule/HourlyMessageSender",
			],
		});
	});

	afterEach(async () => {
		await closeDbClient(client);
	});

	it("successfully sends and logs a single successful notification [integration]", async () => {
		// Attempt to send messages to users
		const result = await handler(messageSenderEvent, {} as Context);

		expect(result.statusCode).toBe(200);
		const responseMessage = result.body.message;
		const responseResults = result.body.results;
		expect(responseMessage).not.toBe("No users to notify");
		expect(responseResults).toBeDefined();

		if (responseResults) {
			expect(responseResults.length).toBe(1);
			const successUserResult = responseResults.find(
				(r: HandlerResultItem) =>
					r.user_id === testUser.user_id && r.status === "sent",
			);
			expect(successUserResult).toBeDefined();
			expect(successUserResult?.message_sid).toContain("SM");
		} else {
			throw new Error(
				"responseResults was unexpectedly undefined after a check.",
			);
		}

		// Verify notification log in the database
		const logs = await client.query(
			"SELECT * FROM notifications_log WHERE user_id = $1 ORDER BY sent_at ASC",
			[testUser.user_id],
		);

		expect(logs.rows.length).toBe(1); // Expecting one log entry for the sent notification

		const sentLog = logs.rows[0];
		expect(sentLog.user_id).toBe(testUser.user_id);
		expect(sentLog.type).toBe("astronomy_photo");
		expect(sentLog.status).toBe("sent");
		// When using test credentials, Twilio will return a test SID
		expect(sentLog.message).toContain("SM"); // Twilio message SIDs start with SM
	});

	it("successfully sends and logs a single failed notification [integration]", async () => {
		const result = await handler(messageSenderEvent, {} as Context);

		expect(result.statusCode).toBe(200);

		const responseMessage = result.body.message;
		const responseResults = result.body.results;
		expect(responseMessage).not.toBe("No users to notify");
		expect(responseResults).toBeDefined();

		if (responseResults) {
			expect(responseResults.length).toBe(1);
			const failUserResult = responseResults.find(
				(r: HandlerResultItem) =>
					r.user_id === failTestUser.user_id && r.status === "failed",
			);
			expect(failUserResult).toBeDefined();
			expect(failUserResult?.error).toBeDefined();
		} else {
			throw new Error(
				"responseResults was unexpectedly undefined after a check.",
			);
		}

		// Verify 'failed' log in the database
		const logs = await client.query(
			"SELECT * FROM notifications_log WHERE user_id = $1 ORDER BY sent_at ASC",
			[failTestUser.user_id],
		);

		expect(logs.rows.length).toBe(1); // Expecting one log entry for the failed notification

		const failedLog = logs.rows[0];
		expect(failedLog.user_id).toBe(failTestUser.user_id);
		expect(failedLog.type).toBe("astronomy_photo");
		expect(failedLog.status).toBe("failed");
		expect(failedLog.message).toBeDefined(); // Expecting an error message
		// Twilio error for invalid 'To' number when using test credentials
		expect(failedLog.message).toContain("63003");
	});

	it("should return 'No users to notify' when no users are scheduled for the current hour", async () => {
		const result = await handler(noMessageSenderEvent, {} as Context);

		expect(result.statusCode).toBe(200);
		const responseMessage = result.body.message;
		const responseResults = result.body.results;

		expect(responseMessage).toBe("No users to notify");
		expect(responseResults).toBeUndefined();

		// Verify no logs were created for the test users
		const logsTestUser = await client.query(
			"SELECT * FROM notifications_log WHERE user_id = $1",
			[testUser.user_id],
		);
		expect(logsTestUser.rows.length).toBe(0);

		const logsFailUser = await client.query(
			"SELECT * FROM notifications_log WHERE user_id = $1",
			[failTestUser.user_id],
		);
		expect(logsFailUser.rows.length).toBe(0);
	});
});
