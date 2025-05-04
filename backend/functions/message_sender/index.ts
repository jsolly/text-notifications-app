import type { Context, APIGatewayProxyEvent } from "aws-lambda";
import { Client as PgClient } from "pg";
import twilio from "twilio";
import type { Notification } from "@text-notifications/shared";
import { NOTIFICATION_SCHEMA } from "@text-notifications/shared";

// Use the test database if it exists, otherwise use the production database
const DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

// Define notification types from the schema
const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_SCHEMA) as Notification[];

type NotificationType = (typeof NOTIFICATION_TYPES)[number];

interface User {
	user_id: string;
	full_phone: string;
	language: string;
	name: string;
	city_id?: string; // Add city_id to user interface
}

interface Content {
	title?: string;
	explanation?: string;
	url?: string;
	media_type?: string;
	[key: string]: unknown;
}

interface Message {
	body: string;
	media_url?: string[];
}

interface NotificationResult {
	user_id: string;
	phone_number: string;
	notification_type: string;
	status: "sent" | "failed";
	message_sid?: string;
	error?: string;
}

async function getLatestNasaApodMetadata(): Promise<Content> {
	const client = new PgClient(DATABASE_URL);
	await client.connect();

	try {
		const result = await client.query(`
      SELECT title, explanation, original_url, media_type 
      FROM NASA_APOD 
      ORDER BY date DESC
      LIMIT 1
    `);

		if (result.rows.length === 0) {
			throw new Error("No NASA APOD data found");
		}

		const row = result.rows[0];
		return {
			title: row.title,
			explanation: row.explanation,
			url: row.original_url,
			media_type: row.media_type,
		};
	} finally {
		await client.end();
	}
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
async function getUsersToNotify(): Promise<Record<NotificationType, User[]>> {
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

	const client = new PgClient(DATABASE_URL);
	await client.connect();

	try {
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
	} finally {
		await client.end();
	}
}

async function getNotificationContent(
	notificationType: NotificationType,
): Promise<Content> {
	switch (notificationType) {
		case "astronomy_photo_of_the_day":
			return await getLatestNasaApodMetadata();
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
				message.media_url = [content.url as string];
			}
			break;
		// Add other notification type formatting cases here
	}

	return message;
}

async function sendNotification(
	targetPhoneNumber: string,
	messageBody: string,
	mediaUrl?: string[],
): Promise<string> {
	try {
		const twilioClient = twilio(
			process.env.TWILIO_ACCOUNT_SID as string,
			process.env.TWILIO_AUTH_TOKEN as string,
		);

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

		if (mediaUrl) {
			messageParams.mediaUrl = mediaUrl;
		}

		const message = await twilioClient.messages.create(messageParams);

		// Log message status for debugging
		console.log(
			`Message sent to ${targetPhoneNumber} with SID: ${message.sid}`,
		);

		return message.sid;
	} catch (e) {
		const error = e as Error;
		console.log(
			`Failed to send message to ${targetPhoneNumber}: ${error.message}`,
		);
		throw error;
	}
}

/**
 * Log the notification in the database
 *
 * @param user The user to log notification for
 * @param notificationType The type of notification that was sent
 * @param status The delivery status (sent, failed, etc.)
 * @param messageSid The Twilio message SID (if successfully sent)
 * @param errorMessage The error message (if delivery failed)
 */
async function logNotificationInDatabase(
	user: User,
	notificationType: NotificationType,
	status: "pending" | "sent" | "failed",
	messageSid?: string,
	errorMessage?: string,
): Promise<void> {
	const client = new PgClient(DATABASE_URL);
	try {
		await client.connect();

		const now = new Date();

		await client.query(
			`
			INSERT INTO notifications_log (
				user_id,
				city_id,
				notification_type,
				notification_time,
				sent_time,
				delivery_status,
				response_message
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
			`,
			[
				user.user_id,
				user.city_id,
				notificationType,
				now,
				status === "pending" ? null : now,
				status,
				status === "sent" ? messageSid : errorMessage,
			],
		);

		console.log(`Notification logged in database for user ${user.user_id}`);
	} catch (e) {
		const error = e as Error;
		console.log(`Failed to log notification to database: ${error.message}`);
	} finally {
		await client.end();
	}
}

export const handler = async (
	event: APIGatewayProxyEvent,
	context: Context,
): Promise<{
	statusCode: number;
	body: {
		message: string;
		results?: NotificationResult[];
	};
}> => {
	try {
		// Get users to notify, organized by notification type
		const usersByNotificationType = await getUsersToNotify();

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
			const content = await getNotificationContent(notificationType);

			// Send notifications to each user for this type
			for (const user of users) {
				try {
					// First, log a pending notification
					await logNotificationInDatabase(user, notificationType, "pending");

					// Format message for this user
					const message = formatNotificationMessage(
						notificationType,
						content,
						user,
					);

					// Send the message
					const messageSid = await sendNotification(
						user.full_phone,
						message.body,
						message.media_url,
					);

					// Update notification status to sent
					await logNotificationInDatabase(
						user,
						notificationType,
						"sent",
						messageSid,
					);

					// Record result
					results.push({
						user_id: user.user_id,
						phone_number: user.full_phone,
						notification_type: notificationType,
						status: "sent",
						message_sid: messageSid,
					});
				} catch (e) {
					const error = e as Error;
					console.log(
						`Failed to send ${notificationType} to ${user.full_phone}: ${error.message}`,
					);

					// Log the failed notification
					await logNotificationInDatabase(
						user,
						notificationType,
						"failed",
						undefined,
						error.message,
					);

					results.push({
						user_id: user.user_id,
						phone_number: user.full_phone,
						notification_type: notificationType,
						status: "failed",
						error: error.message,
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
		console.log(`Error processing notifications: ${error.message}`);
		throw error;
	}
};

export default { handler };
