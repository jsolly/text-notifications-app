import { Client } from "pg";
import type { SignupFormData } from "../../shared/types/form.schema";

export const getDbClient = async (): Promise<Client> => {
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});
	await client.connect();
	return client;
};

export const insertSignupData = async (
	client: Client,
	userData: SignupFormData,
): Promise<void> => {
	try {
		await client.query("BEGIN");

		// Insert contact info
		const userResult = await client.query(
			`INSERT INTO users (phone_number, city_id)
			 VALUES ($1, $2)
			 RETURNING id`,
			[userData.contactInfo.phoneNumber, userData.contactInfo.cityId],
		);

		const userId = userResult.rows[0].id;

		// Insert preferences
		await client.query(
			`INSERT INTO user_preferences (user_id, preferred_language, unit_preference, time_format)
			 VALUES ($1, $2, $3, $4)`,
			[
				userId,
				userData.preferences.preferredLanguage,
				userData.preferences.unitPreference,
				userData.preferences.timeFormat,
			],
		);

		// Insert notification preferences
		await client.query(
			`INSERT INTO user_notifications (
				user_id, daily_fullmoon, daily_nasa, daily_weather_outfit,
				daily_recipe, instant_sunset, daily_notification_time
			 ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[
				userId,
				userData.notifications.dailyFullmoon,
				userData.notifications.dailyNasa,
				userData.notifications.dailyWeatherOutfit,
				userData.notifications.dailyRecipe,
				userData.notifications.instantSunset,
				userData.notifications.dailyNotificationTime,
			],
		);

		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
};
