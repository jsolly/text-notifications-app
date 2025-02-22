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

	console.debug("pg module type:", typeof Client);
	console.debug("pg module keys:", Object.keys(Client));
	console.debug("Client constructor type:", typeof Client);
	console.debug("Client prototype:", Object.getPrototypeOf(Client));

	try {
		console.debug(
			"Attempting to create a new pg Client with connection string:",
			process.env.DATABASE_URL,
		);
		const client = new Client({
			connectionString: process.env.DATABASE_URL,
		});

		// Validate client instance
		if (!client || typeof client.query !== "function") {
			console.error("Invalid client instance created:", {
				clientType: Object.prototype.toString.call(client),
				hasQueryMethod: client && typeof client.query === "function",
				prototype: Object.getPrototypeOf(client),
				ownKeys: Object.keys(client),
			});
			throw new Error("Failed to create valid database client instance");
		}

		console.debug("Client instance created:", {
			type: Object.prototype.toString.call(client),
			hasQueryMethod: typeof client.query === "function",
			prototype: Object.getPrototypeOf(client),
			ownKeys: Object.keys(client),
			constructorName: client.constructor.name,
		});

		await client.connect();
		console.debug("Client connected successfully.");
		return client;
	} catch (error) {
		console.error("Database connection error:", {
			name: error instanceof Error ? error.name : "Unknown",
			message: error instanceof Error ? error.message : String(error),
			code: (error as PostgresError).code,
		});
		throw error;
	}
};

export const insertSignupData = async (
	client: PGClient,
	userData: SignupFormData,
): Promise<void> => {
	try {
		console.debug("Starting database transaction for signup data.");
		console.debug("Client.query type:", typeof client.query);
		await client.query("BEGIN");
		console.debug("Transaction started.");

		// Insert user
		console.debug("Executing user insertion query.");
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
		console.debug("User inserted, user id:", userId);

		// Insert notification preferences
		console.debug(
			"Executing notification preferences insertion query for user id:",
			userId,
		);
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
		console.debug("Notification preferences inserted.");

		await client.query("COMMIT");
		console.debug("Transaction committed successfully.");
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
