import { Client } from "pg";
import type { SignupFormData } from "../../shared/types/form.schema";

interface PostgresError extends Error {
	code: string;
	constraint?: string;
}

export const getDbClient = async (): Promise<Client> => {
	console.log("Attempting to create database client...");
	if (!process.env.DATABASE_URL) {
		console.error("DATABASE_URL environment variable is missing");
		throw new Error("DATABASE_URL environment variable is not set");
	}
	console.log("Database URL exists, creating client...");

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});

	console.log("Client created, attempting connection...");
	try {
		await client.connect();
		console.log("Successfully connected to database");

		// Test connection with a simple query
		console.log("Testing connection with simple query...");
		await client.query("SELECT 1");
		console.log("Test query successful");

		return client;
	} catch (error) {
		console.error("Error in database connection:", error);
		throw error;
	}
};

export const insertSignupData = async (
	client: Client,
	userData: SignupFormData,
): Promise<void> => {
	console.log("Starting insertSignupData...");
	console.log("Received client type:", typeof client);
	console.log("Client methods available:", Object.keys(client));

	try {
		console.log("Beginning transaction...");
		await client.query("BEGIN");

		console.log("Inserting user data:", {
			name: userData.contactInfo.name,
			phoneNumber: userData.contactInfo.phoneNumber,
			language: userData.preferences.preferredLanguage,
			cityId: userData.contactInfo.cityId,
		});

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
