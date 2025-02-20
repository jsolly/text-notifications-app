import { Client } from "pg";
import type { SignupFormData } from "../../shared/types/form.schema";

interface PostgresError extends Error {
	code: string;
	constraint?: string;
}

export const getDbClient = async (): Promise<Client> => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});
	await client.connect();

	// Test connection with a simple query
	await client.query("SELECT 1");
	return client;
};

export const insertSignupData = async (
	client: Client,
	userData: SignupFormData,
): Promise<void> => {
	try {
		await client.query("BEGIN");

		// Insert user
		const userResult = await client.query(
			`INSERT INTO Users (
				preferred_name, phone_number, preferred_language,
				city_id, unit_preference, daily_notification_time
			) VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING user_id`,
			[
				userData.contactInfo.name,
				userData.contactInfo.phoneNumber,
				userData.preferences.preferredLanguage,
				userData.contactInfo.cityId,
				userData.preferences.unitPreference,
				userData.preferences.dailyNotificationTime,
			],
		);

		const userId = userResult.rows[0].user_id;

		// Insert notification preferences
		await client.query(
			`INSERT INTO Notification_Preferences (
				user_id, daily_fullmoon, daily_nasa, daily_weather_outfit,
				daily_recipe, instant_sunset
			) VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				userId,
				userData.notifications.dailyFullmoon,
				userData.notifications.dailyNasa,
				userData.notifications.dailyWeatherOutfit,
				userData.notifications.dailyRecipe,
				userData.notifications.instantSunset,
			],
		);

		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		if (
			(error as PostgresError).code === "23505" &&
			(error as PostgresError).constraint === "users_phone_number_key"
		) {
			throw new Error("A user with that phone number already exists.");
		}
		throw error;
	}
};
