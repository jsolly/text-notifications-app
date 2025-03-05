import { Client } from "pg";

/**
 * Gets a database client
 * @returns A PostgreSQL client
 */
export const getDbClient = async (): Promise<Client> => {
	// Use the actual database URL for all environments
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});

	await client.connect();
	return client;
};

/**
 * Executes a database transaction
 * @param client The database client
 * @param callback The callback function to execute within the transaction
 * @returns The result of the callback
 */
export const executeTransaction = async <T>(
	client: Client,
	callback: () => Promise<T>,
): Promise<T> => {
	// Start a transaction
	await client.query("BEGIN");

	try {
		const result = await callback();
		// Commit the transaction
		await client.query("COMMIT");
		return result;
	} catch (error) {
		// Rollback the transaction on error
		await client.query("ROLLBACK");
		console.error("Error during transaction, rolling back:", error);
		throw error;
	}
};

/**
 * Generates a SQL insert statement and parameters from a schema and data
 * @param tableName The name of the table to insert into
 * @param data The data to insert
 * @param options Additional options for the insert
 * @returns Object containing the SQL statement and parameters
 */
export const generateInsertStatement = <T extends Record<string, unknown>>(
	tableName: string,
	data: T,
	options: {
		excludeFields?: string[];
		includeFields?: string[];
	} = {},
): { sql: string; params: unknown[] } => {
	const { excludeFields = [], includeFields = [] } = options;

	// Get all fields from data that should be included
	const fields = Object.keys(data).filter(
		(field) =>
			!excludeFields.includes(field) &&
			(includeFields.length === 0 || includeFields.includes(field)) &&
			field !== "id" && // Always exclude 'id' field as it's handled by the database
			field !== "user_id", // Also exclude 'user_id' as it's handled by the database
	);

	// Generate column names (already in snake_case)
	const columns = fields;

	// Generate parameter placeholders
	const placeholders = fields.map((_, index) => `$${index + 1}`);

	// Get values in the correct order
	const values = fields.map((field) => data[field as keyof T]);

	// Build the SQL statement
	const sql = `INSERT INTO ${tableName} (
		${columns.join(", ")}
	) VALUES (${placeholders.join(", ")}) RETURNING *`;

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
