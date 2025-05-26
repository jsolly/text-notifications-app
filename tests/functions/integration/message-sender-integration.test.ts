import type { Context, EventBridgeEvent } from "aws-lambda";
import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NotificationResult as HandlerResultItem } from "../../../backend/functions/message-sender/index.js";
import { handler } from "../../../backend/functions/message-sender/index.js";
import type { User } from "../../../backend/functions/shared/db.js";
import {
	closeDbClient,
	getDbClient,
} from "../../../backend/functions/shared/db.js";
import { createAPODRecord, createTestUser } from "./utils/function-utils.js";
import { createEventBridgeEvent } from "./utils/lambda-utils.js";

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
	let testUser: User | undefined;
	let failTestUser: User | undefined;

	beforeEach(async () => {
		client = await getDbClient(process.env.DATABASE_URL_TEST as string);
		await client.query(
			"TRUNCATE notifications_log, notification_preferences, users, nasa_apod RESTART IDENTITY CASCADE",
		);
		await createAPODRecord();

		messageSenderEvent = createEventBridgeEvent({
			time: "2023-09-15T12:00:00Z",
			resources: [
				"arn:aws:events:us-east-1:123456789012:rule/HourlyMessageSender",
			],
		});

		noMessageSenderEvent = createEventBridgeEvent({
			time: "2023-09-15T12:00:00Z",
			resources: [
				"arn:aws:events:us-east-1:123456789012:rule/HourlyMessageSender",
			],
		});
	});

	afterEach(async () => {
		await client.query("DELETE FROM nasa_apod");
		await closeDbClient(client);
	});

	it("successfully sends and logs a single successful notification [integration]", async () => {
		testUser = await createTestUser({
			notificationPreferences: {
				astronomy_photo: true,
				celestial_events: false,
				weather_outfits: false,
				recipes: false,
				sunset_alerts: false,
			},
		});
		const result = await handler(messageSenderEvent, {} as Context);
		expect(result.statusCode).toBe(200);
		const responseMessage = result.body.message;
		const responseResults = result.body.results;
		expect(responseMessage).not.toBe("No users to notify");
		expect(responseResults).toBeDefined();
		if (responseResults) {
			const astronomyResults = responseResults.filter(
				(r: HandlerResultItem) =>
					r.user_id === testUser!.user_id &&
					r.notification_type === "astronomy_photo" &&
					r.status === "sent",
			);
			expect(astronomyResults.length).toBe(1);
			const successUserResult = astronomyResults[0];
			expect(successUserResult).toBeDefined();
			expect(successUserResult?.message_sid).toContain("SM");
		} else {
			throw new Error(
				"responseResults was unexpectedly undefined after a check.",
			);
		}
		const logs = await client.query(
			"SELECT * FROM notifications_log WHERE user_id = $1 AND type = 'astronomy_photo' ORDER BY sent_at ASC",
			[testUser!.user_id],
		);
		expect(logs.rows.length).toBe(1);
		const sentLog = logs.rows[0];
		expect(sentLog.user_id).toBe(testUser!.user_id);
		expect(sentLog.type).toBe("astronomy_photo");
		expect(sentLog.status).toBe("sent");
		expect(sentLog.message).toContain("SM");
	});

	it("successfully sends and logs a single failed notification [integration]", async () => {
		failTestUser = await createTestUser({
			failureNumber: true,
			notificationPreferences: {
				astronomy_photo: true,
				celestial_events: false,
				weather_outfits: false,
				recipes: false,
				sunset_alerts: false,
			},
		});
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
					r.user_id === failTestUser!.user_id && r.status === "failed",
			);
			expect(failUserResult).toBeDefined();
			expect(failUserResult?.error).toMatch(/not a mobile number|63003/);
		} else {
			throw new Error(
				"responseResults was unexpectedly undefined after a check.",
			);
		}
		const logs = await client.query(
			"SELECT * FROM notifications_log WHERE user_id = $1 ORDER BY sent_at ASC",
			[failTestUser!.user_id],
		);
		expect(logs.rows.length).toBe(1);
		const failedLog = logs.rows[0];
		expect(failedLog.user_id).toBe(failTestUser!.user_id);
		expect(failedLog.type).toBe("astronomy_photo");
		expect(failedLog.status).toBe("failed");
		expect(failedLog.message).toBeDefined();
		expect(failedLog.message).toMatch(/not a mobile number|63003/);
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
			[testUser?.user_id],
		);
		expect(logsTestUser.rows.length).toBe(0);
		const logsFailUser = await client.query(
			"SELECT * FROM notifications_log WHERE user_id = $1",
			[failTestUser?.user_id],
		);
		expect(logsFailUser.rows.length).toBe(0);
	});
});
