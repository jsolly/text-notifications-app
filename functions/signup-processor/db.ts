import { Client } from "pg";
import type { SignupFormData } from "../../shared/types/form.schema";
import type { Client as PGClient } from "pg";

interface PostgresError extends Error {
	code: string;
	constraint?: string;
	detail?: string;
}

export const getDbClient = async (): Promise<PGClient> => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	try {
		const client = new Client({
			connectionString: process.env.DATABASE_URL,
		});

		await client.connect();
		return client;
	} catch (error) {
		console.error("Failed to connect to database:", error);
		throw error;
	}
};

export const insertSignupData = async (
	client: PGClient,
	userData: SignupFormData,
): Promise<void> => {
	try {
		await client.query("BEGIN");

		// Insert user
		const userResult = await client.query(
			`INSERT INTO users (
				user_id, city_id, preferred_name, preferred_language, 
				phone_country_code, phone_number, unit_preference, 
				daily_notification_time, is_active
			) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, DEFAULT)
			RETURNING user_id`,
			[
				userData.contactInfo.cityId,
				userData.contactInfo.name,
				userData.preferences.preferredLanguage,
				userData.contactInfo.phoneCountryCode,
				userData.contactInfo.phoneNumber,
				userData.preferences.unitPreference,
				userData.preferences.dailyNotificationTime,
			],
		);

		const userId = userResult.rows[0].user_id;

		// Insert notification preferences
		await client.query(
			`INSERT INTO notification_preferences (
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
		console.error("Error during transaction, rolling back:", error);
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
