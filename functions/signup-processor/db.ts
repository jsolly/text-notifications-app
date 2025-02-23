import { Client } from "pg";
import type { SignupFormData } from "../../shared/types/form.schema";
import type { Client as PGClient } from "pg";

// Verify pg module
console.debug("=== PG Module Verification ===");
console.debug("Direct import check:", {
	Client: typeof Client,
	hasConstructor: typeof Client === "function",
	prototype: Client.prototype ? Object.keys(Client.prototype) : "no prototype",
});

try {
	const testClient = new Client({});
	console.debug("Test client creation:", {
		success: true,
		type: typeof testClient,
		methods: Object.keys(Object.getPrototypeOf(testClient)),
	});
} catch (e) {
	console.debug("Test client creation failed:", {
		error: e instanceof Error ? e.message : String(e),
	});
}

interface PostgresError extends Error {
	code: string;
	constraint?: string;
	detail?: string;
}

export const getDbClient = async (): Promise<PGClient> => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	console.debug("=== PG Module Debug Info ===");
	console.debug("1. pg module import check:");
	console.debug("- typeof pg.Client:", typeof Client);
	console.debug("- Client constructor name:", Client.name);
	console.debug("- Client prototype chain:", Object.getPrototypeOf(Client));
	console.debug(
		"- Available static methods:",
		Object.getOwnPropertyNames(Client),
	);

	console.debug("\n2. Environment Info:");
	console.debug("- Node version:", process.version);
	console.debug("- Platform:", process.platform);
	console.debug("- Architecture:", process.arch);

	try {
		console.debug("\n3. Client Instance Creation:");
		console.debug(
			"Creating new Client with connection string:",
			process.env.DATABASE_URL,
		);

		const client = new Client({
			connectionString: process.env.DATABASE_URL,
		});

		console.debug("\n4. Client Instance Debug:");
		console.debug("- client type:", typeof client);
		console.debug("- client constructor:", client.constructor.name);
		console.debug("- client prototype chain:", Object.getPrototypeOf(client));
		console.debug(
			"- Available instance methods:",
			Object.getOwnPropertyNames(Object.getPrototypeOf(client)),
		);
		console.debug("- query method type:", typeof client.query);
		console.debug("- connect method type:", typeof client.connect);

		// Validate client instance
		if (!client || typeof client.query !== "function") {
			console.error("\n5. Client Validation Failed:");
			console.error("- client exists:", !!client);
			console.error("- client type:", Object.prototype.toString.call(client));
			console.error(
				"- hasQueryMethod:",
				client && typeof client.query === "function",
			);
			console.error("- available methods:", Object.keys(client));
			console.error(
				"- prototype methods:",
				client ? Object.getOwnPropertyNames(Object.getPrototypeOf(client)) : [],
			);
			throw new Error("Failed to create valid database client instance");
		}

		console.debug("\n6. Attempting Connection:");
		await client.connect();
		console.debug("Connection successful!");

		return client;
	} catch (error) {
		console.error("\n7. Error Details:");
		console.error(
			"- Error name:",
			error instanceof Error ? error.name : "Unknown",
		);
		console.error(
			"- Error message:",
			error instanceof Error ? error.message : String(error),
		);
		console.error("- Error code:", (error as PostgresError).code);
		console.error("- Full error:", error);
		throw error;
	}
};

export const insertSignupData = async (
	client: PGClient,
	userData: SignupFormData,
): Promise<void> => {
	try {
		console.debug("\n=== Insert Signup Data Debug ===");
		console.debug("1. Client State Check:");
		console.debug("- client type:", typeof client);
		console.debug("- client constructor:", client?.constructor?.name);
		console.debug("- query method exists:", "query" in client);
		console.debug("- query method type:", typeof client.query);
		console.debug(
			"- Available methods:",
			Object.getOwnPropertyNames(Object.getPrototypeOf(client)),
		);

		console.debug("\n2. Starting Transaction");
		await client.query("BEGIN");
		console.debug("Transaction started successfully");

		console.debug("\n3. Preparing User Insert");
		console.debug("User data to insert:", {
			name: userData.contactInfo.name,
			phoneNumber: userData.contactInfo.phoneNumber,
			cityId: userData.contactInfo.cityId,
			// ... other fields
		});

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
