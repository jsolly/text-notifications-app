import type {
	Context,
	APIGatewayProxyEvent,
	EventBridgeEvent,
} from "aws-lambda";
import type { PoolClient as PgClient } from "pg";
import twilio from "twilio";
import type { Notification } from "@text-notifications/shared";
import { NOTIFICATION_SCHEMA } from "@text-notifications/shared";
import type { User } from "../shared/db";
import { getDbClient, closeDbClient, NotificationsLogger } from "../shared/db";

// Define notification types from the schema
const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_SCHEMA) as Notification[];

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

async function getLatestNasaApodMetadata(client: PgClient): Promise<Content> {
	const result = await client.query(`
      SELECT title, explanation, original_url, media_type 
      FROM NASA_APOD 
      ORDER BY date DESC
      LIMIT 1
    `);

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
 * - Each notification type (astronomy_photo_of_the_day, celestial_events, etc.) is a boolean flag
 * - Users are only added to a notification type's distribution list if their preference is enabled
 *
 * Returns:
 * - Users organized by notification type in a record structure
 * - Each notification type maps to an array of eligible users
 * - A user may appear in multiple notification type arrays if they've enabled multiple preferences
 */
async function getUsersToNotify(
	client: PgClient,
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
        u.user_id,
        u.full_phone,
        u.language_preference,
        u.name_preference,
        u.city_id,
        np.astronomy_photo_of_the_day,
        np.celestial_events,
        np.weather_outfit_suggestions,
        np.recipe_suggestions,
        np.sunset_alerts
      FROM users u
      JOIN notification_preferences np ON u.user_id = np.user_id
      WHERE u.is_active = true
      AND u.utc_notification_time >= $1
      AND u.utc_notification_time < $2
    `,
		[startTimeStr, endTimeStr],
	);

	// Organize users by notification type
	const usersByNotificationType = {} as Record<NotificationType, User[]>;

	// Initialize empty arrays for each notification type
	for (const type of NOTIFICATION_TYPES) {
		usersByNotificationType[type] = [];
	}

	// Group users by notification preferences
	for (const row of result.rows) {
		for (const notificationType of NOTIFICATION_TYPES) {
			if (row[notificationType]) {
				usersByNotificationType[notificationType].push({
					user_id: row.user_id,
					full_phone: row.full_phone,
					language: row.language_preference,
					name: row.name_preference,
					city_id: row.city_id,
				});
			}
		}
	}

	return usersByNotificationType;
}

async function getNotificationContent(
	notificationType: NotificationType,
	client: PgClient,
): Promise<Content> {
	switch (notificationType) {
		case "astronomy_photo_of_the_day":
			return await getLatestNasaApodMetadata(client);
		case "celestial_events":
			// TODO: Implement celestial events content retrieval
			return {
				title: "Celestial Events",
				explanation: "No celestial events today",
			};
		case "weather_outfit_suggestions":
			// TODO: Implement weather-based outfit suggestions
			return {
				title: "Weather Outfit Suggestions",
				explanation: "No weather outfit suggestions today",
			};
		case "recipe_suggestions":
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
		case "astronomy_photo_of_the_day":
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

	const message = await messageClient.messages.create(messageParams);
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
	let dbClient: PgClient | null = null;
	let logger: NotificationsLogger | null = null;

	try {
		const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
		if (!dbUrl) {
			throw new Error(
				"Neither DATABASE_URL_TEST nor DATABASE_URL environment variables are set",
			);
		}
		dbClient = await getDbClient(dbUrl);
		logger = new NotificationsLogger(dbClient);

		// Get users to notify, organized by notification type
		const usersByNotificationType = await getUsersToNotify(
			dbClient as PgClient,
		);

		const totalUsers = Object.values(usersByNotificationType).reduce(
			(sum, users) => sum + users.length,
			0,
		);

		// If there are no users to notify, return
		if (totalUsers === 0) {
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

			// Get content for this notification type
			const content = await getNotificationContent(
				notificationType,
				dbClient as PgClient,
			);

			// Send notifications to each user for this type
			for (const user of users) {
				let message: Message = { body: "" };
				try {
					// First, log a pending notification
					await logger.logNotification(user, notificationType, "pending");

					// Format message for this user
					message = formatNotificationMessage(notificationType, content, user);

					// Send the message
					const messageSid = await sendNotification(
						user.full_phone,
						message.body,
						messageClient,
						message.media_urls,
					);

					// Update notification status to sent
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
