import type {
	Context,
	APIGatewayProxyEvent,
	EventBridgeEvent,
} from "aws-lambda";
import type pg from "pg";
import twilio from "twilio";
import { NOTIFICATION_SCHEMA } from "@text-notifications/shared";
import type { User } from "../shared/db.js";
import {
	getDbClient,
	closeDbClient,
	NotificationsLogger,
} from "../shared/db.js";

/**
 * SCALABILITY IMPROVEMENTS NEEDED:
 *
 * This Lambda function needs optimization to handle large user volumes:
 *
 * 1. Replace sequential processing with batched, parallel notification dispatch:
 *    - Split user lists into manageable chunks (25-50 users per batch)
 *    - Process chunks with controlled parallelism (Promise.all or p-queue)
 *    - Maintain a safe concurrency limit to avoid overwhelming Twilio API
 *
 * 2. Add failure resilience:
 *    - Implement per-request timeouts for Twilio calls
 *    - Add retry logic for transient failures
 *    - Consider dead-letter queues for failed messages
 *
 * 3. Infrastructure optimizations:
 *    - Increase Lambda timeout and memory allocation
 *    - Configure reserved concurrency
 *    - Consider moving to SQS-triggered architecture for high volume scenarios
 *
 * 4. Monitoring:
 *    - Add detailed metrics for batch success/failure rates
 *    - Implement alarm thresholds for notification delivery performance
 */

// Define notification types from the schema
// The keys of NOTIFICATION_SCHEMA will match our database column names
const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_SCHEMA) as Array<
	| "astronomy_photo"
	| "celestial_events"
	| "weather_outfits"
	| "recipes"
	| "sunset_alerts"
>;

type NotificationType = (typeof NOTIFICATION_TYPES)[number];

interface Content {
	title?: string;
	explanation?: string;
	url?: string;
	media_type?: string;
	[key: string]: unknown;
}

interface Message {
	body: string;
	media_urls?: string[];
}

export interface NotificationResult {
	user_id: string;
	phone_number: string;
	notification_type: string;
	status: "sent" | "failed";
	message_sid?: string;
	error?: string;
	media_urls?: string[];
}

async function getLatestNasaApodMetadata(
	client: pg.PoolClient,
): Promise<Content> {
	const result = await client.query(`
      SELECT title, explanation, original_url, media_type 
      FROM NASA_APOD 
      ORDER BY date DESC
      LIMIT 1
    `);

	if (!result.rows[0]) {
		throw new Error("NASA_APOD table is empty: no APOD metadata available.");
	}

	const row = result.rows[0];
	return {
		title: row.title,
		explanation: row.explanation,
		url: row.original_url,
		media_type: row.media_type,
	};
}

/**
 * Get users who should receive notifications in the current hour with their preferences.
 *
 * Timing determination:
 * - Calculates the current UTC hour window (start of hour to start of next hour)
 * - Formats these times as HH:00:00 strings for SQL comparison
 * - Only selects users whose configured notification time falls within this window
 * - The window of time is inclusive of the start, but exclusive of the end.
 * - This way, users excluded at the top of the hour will be included at the start of the next hour next time the function is run.
 *
 * User eligibility:
 * - Only retrieves active users (is_active = true)
 * - Includes each user's phone number, language, and name preferences
 *
 * Notification preferences:
 * - Joins with the notification_preferences table to get user-specific preferences
 * - Each notification type (astronomy_photo, celestial_events, etc.) is a boolean flag
 * - Users are only added to a notification type's distribution list if their preference is enabled
 *
 * Returns:
 * - Users organized by notification type in a record structure
 * - Each notification type maps to an array of eligible users
 * - A user may appear in multiple notification type arrays if they've enabled multiple preferences
 */
async function getUsersToNotify(
	client: pg.PoolClient,
): Promise<Record<NotificationType, User[]>> {
	// Get current UTC time
	const now = new Date();

	// Calculate the start and end of the current hour window
	const startTime = new Date(now);
	startTime.setUTCMinutes(0, 0, 0);

	const endTime = new Date(startTime);
	endTime.setUTCHours(startTime.getUTCHours() + 1);

	// Format times for SQL query (HH:mm:ss)
	const startTimeStr = `${startTime.getUTCHours().toString().padStart(2, "0")}:00:00`;
	const endTimeStr = `${endTime.getUTCHours().toString().padStart(2, "0")}:00:00`;

	const result = await client.query(
		`
      SELECT 
        u.id as user_id,
        u.full_phone,
        u.language,
        u.name,
        u.city_id,
        np.astronomy_photo,
        np.celestial_events,
        np.weather_outfits,
        np.recipes,
        np.sunset_alerts
      FROM users u
      JOIN notification_preferences np ON u.id = np.user_id
      WHERE u.is_active = true
      -- AND u.utc_notification_time >= $1
      -- AND u.utc_notification_time < $2
    `,
		// [startTimeStr, endTimeStr],
	);

	// Organize users by notification type
	const usersByNotificationType = Object.fromEntries(
		NOTIFICATION_TYPES.map((type): [NotificationType, User[]] => [type, []]),
	) as Record<NotificationType, User[]>;

	// Group users by notification preferences
	for (const row of result.rows) {
		for (const notificationType of NOTIFICATION_TYPES) {
			if (row[notificationType]) {
				usersByNotificationType[notificationType].push({
					user_id: row.user_id,
					full_phone: row.full_phone,
					language: row.language,
					name: row.name,
					city_id: row.city_id,
				});
			}
		}
	}

	return usersByNotificationType;
}

async function getNotificationContent(
	notificationType: NotificationType,
	client: pg.PoolClient,
): Promise<Content> {
	switch (notificationType) {
		case "astronomy_photo":
			return await getLatestNasaApodMetadata(client);
		case "celestial_events":
			// TODO: Implement celestial events content retrieval
			return {
				title: "Celestial Events",
				explanation: "No celestial events today",
			};
		case "weather_outfits":
			// TODO: Implement weather-based outfit suggestions
			return {
				title: "Weather Outfit Suggestions",
				explanation: "No weather outfit suggestions today",
			};
		case "recipes":
			// TODO: Implement recipe suggestions
			return {
				title: "Recipe Suggestions",
				explanation: "No recipe suggestions today",
			};
		case "sunset_alerts":
			// TODO: Implement sunset alerts
			return {
				title: "Sunset Alerts",
				explanation: "No sunset alerts today",
			};
		default:
			return {
				title: "Unknown Notification Type",
				explanation: "Unknown notification type",
			};
	}
}

function formatNotificationMessage(
	notificationType: NotificationType,
	content: Content,
	user: User,
): Message {
	const message: Message = { body: "" };

	switch (notificationType) {
		case "astronomy_photo":
			if (content) {
				const greeting = `Hi ${user.name}! `;
				message.body = `${greeting}NASA's Astronomy Picture of the Day!\n\n${content.title}\n\n${content.explanation?.substring(0, 200)}...`;
				message.media_urls = [content.url as string];
			}
			break;
		// Add other notification type formatting cases here
	}

	return message;
}

async function sendNotification(
	targetPhoneNumber: string,
	messageBody: string,
	messageClient: twilio.Twilio,
	mediaUrls?: string[],
): Promise<string> {
	const messageParams: {
		body: string;
		from: string;
		to: string;
		mediaUrl?: string[];
	} = {
		body: messageBody,
		from: process.env.TWILIO_SENDER_PHONE_NUMBER as string,
		to: targetPhoneNumber,
	};

	if (mediaUrls) {
		messageParams.mediaUrl = mediaUrls;
	}

	const timeoutMs = 10000; // 10 seconds timeout
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(
			() =>
				reject(new Error(`Twilio API request timed out after ${timeoutMs}ms`)),
			timeoutMs,
		);
	});

	// Race the actual API call against the timeout
	const message = await Promise.race([
		messageClient.messages.create(messageParams),
		timeoutPromise,
	]);

	return message.sid;
}

export const handler = async (
	event:
		| APIGatewayProxyEvent
		| EventBridgeEvent<"Scheduled Event", Record<string, unknown>>,
	context: Context,
): Promise<{
	statusCode: number;
	body: {
		message: string;
		results?: NotificationResult[];
	};
}> => {
	const messageClient = twilio(
		process.env.TWILIO_ACCOUNT_SID as string,
		process.env.TWILIO_AUTH_TOKEN as string,
	);
	let dbClient: pg.PoolClient | null = null;
	let logger: NotificationsLogger | null = null;

	try {
		const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
		dbClient = await getDbClient(dbUrl);
		logger = new NotificationsLogger(dbClient);

		// Get users to notify, organized by notification type
		const usersByNotificationType = await getUsersToNotify(
			dbClient as pg.PoolClient,
		);

		const totalUsers = Object.values(usersByNotificationType).reduce(
			(sum, users) => sum + users.length,
			0,
		);

		// If there are no users to notify, return
		if (totalUsers === 0) {
			console.log("No users to notify");
			return {
				statusCode: 200,
				body: {
					message: "No users to notify",
				},
			};
		}

		const results: NotificationResult[] = [];

		// Process each notification type
		for (const notificationType of NOTIFICATION_TYPES) {
			const users = usersByNotificationType[notificationType];

			if (users.length === 0) {
				console.log(
					"No users to notify for notification type",
					notificationType,
				);
				continue;
			}

			console.log("Users to notify for notification type", notificationType);
			console.log(users);

			// Get content for this notification type
			const content = await getNotificationContent(
				notificationType,
				dbClient as pg.PoolClient,
			);
			console.log("Content for notification type", notificationType);
			console.log(content);

			// Send notifications to each user for this type
			for (const user of users) {
				let message: Message = { body: "" };
				try {
					// Format message for this user
					message = formatNotificationMessage(notificationType, content, user);
					console.log("Message for user", user);
					console.log(message);

					// Send the message
					console.log(
						`Sending message to ${user.full_phone} with body: ${message.body}`,
					);
					const messageSid = await sendNotification(
						user.full_phone,
						message.body,
						messageClient,
						message.media_urls,
					);

					// Log notification as sent
					await logger.logNotification(
						user,
						notificationType,
						"sent",
						messageSid,
					);
					results.push({
						user_id: user.user_id,
						phone_number: user.full_phone,
						notification_type: notificationType,
						status: "sent",
						message_sid: messageSid,
					});
				} catch (e) {
					const error = e as Error;
					console.error("Error sending message", {
						user_id: user.user_id,
						notificationType,
						errorMessage: error.message,
					});
					if (logger) {
						await logger.logNotification(
							user,
							notificationType,
							"failed",
							undefined,
							error.message,
						);
					} else {
						console.error("Logger not available for failure logging", {
							user_id: user.user_id,
							notificationType,
							errorMessage: error.message,
						});
					}

					results.push({
						user_id: user.user_id,
						phone_number: user.full_phone,
						notification_type: notificationType,
						status: "failed",
						error: error.message,
						media_urls: message.media_urls,
					});
				}
			}
		}

		return {
			statusCode: 200,
			body: {
				message: `Successfully processed ${results.length} notifications for ${totalUsers} users`,
				results: results,
			},
		};
	} catch (e) {
		const error = e as Error;
		console.error("Error processing notifications", {
			errorMessage: error.message,
			stack: error.stack,
		});
		return {
			statusCode: 500,
			body: {
				message: `Error processing notifications: ${error.message}`,
			},
		};
	} finally {
		if (dbClient) {
			await closeDbClient(dbClient);
			dbClient = null;
		}
	}
};

export default { handler };
