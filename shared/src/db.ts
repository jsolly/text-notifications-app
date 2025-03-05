import { Pool } from "pg";
import type { DbClient } from "./types.js";

/**
 * Gets a database client
 * @returns A PostgreSQL client
 */
export const getDbClient = (): DbClient => {
	return new Pool({
		connectionString: process.env.DATABASE_URL,
	});
};

/**
 * Executes a database transaction
 * @param client The database client
 * @param callback The callback function to execute within the transaction
 * @returns The result of the callback
 */
export const executeTransaction = async <T>(
	client: DbClient,
	callback: () => Promise<T>,
): Promise<T> => {
	const connection = await client.connect();
	try {
		await connection.query("BEGIN");
		const result = await callback();
		await connection.query("COMMIT");
		return result;
	} catch (error) {
		await connection.query("ROLLBACK");
		throw error;
	} finally {
		connection.release();
	}
};

/**
 * Generates a SQL insert statement and parameters from a schema and data
 * @param tableName The name of the table to insert into
 * @param data The data to insert
 * @returns Object containing the SQL statement and parameters
 */
export const generateInsertStatement = <T extends Record<string, unknown>>(
	tableName: string,
	data: T,
): { sql: string; params: unknown[] } => {
	const fields = Object.keys(data);
	const placeholders = fields.map((_, index) => `$${index + 1}`);
	const values = fields.map((field) => data[field as keyof T]);

	const sql = `INSERT INTO ${tableName} (${fields.join(", ")}) 
				 VALUES (${placeholders.join(", ")}) 
				 RETURNING *`;

	return { sql, params: values };
};

/**
 * Generates a SQL insert statement for notification preferences
 * @param userId The user ID to associate the preferences with
 * @param notifications The notification preferences
 * @returns Object containing the SQL statement and parameters
 */
export const generateNotificationPreferencesInsert = (
	userId: string,
	notifications: Record<string, boolean>,
): { sql: string; params: unknown[] } => {
	// Map notification types to column names
	const columnMapping: Record<string, string> = {
		daily_celestial_events: "daily_celestial_events",
		daily_nasa: "daily_nasa",
		daily_weather_outfit: "daily_weather_outfit",
		daily_recipe: "daily_recipe",
		instant_sunset: "instant_sunset",
	};

	// Get unique column names from the mapping
	const columns = [...new Set(Object.values(columnMapping))];

	// Generate parameter placeholders
	const placeholders = columns.map((_, index) => `$${index + 1}`);

	// Get values in the correct order, combining values for columns that map to the same column
	const values: unknown[] = [];
	for (const column of columns) {
		// Find all notification types that map to this column
		const notificationTypes = Object.entries(columnMapping)
			.filter(([_, col]) => col === column)
			.map(([type]) => type);

		// If any of the notification types are true, the column should be true
		const value = notificationTypes.some(
			(type) => notifications[type] ?? false,
		);
		values.push(value);
	}

	const sql = `INSERT INTO notification_preferences (
		user_id, ${columns.join(", ")}
	) VALUES ('${userId}', ${placeholders.join(", ")})`;

	return { sql, params: values };
};
