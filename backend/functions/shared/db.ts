import type { NotificationField } from "@text-notifications/shared";
import postgres, { type Sql } from "postgres";

export interface User {
	user_id: string;
	full_phone: string;
	language: string;
	name: string;
	city_id?: string;
	city_name?: string;
}

/**
 * Database connection pool - maintained across Lambda invocations within the same container
 *
 * In AWS Lambda, the code outside the handler function executes only when the container
 * is initialized. This creates a connection pool that's reused across multiple invocations
 * handled by the same container instance, improving performance.
 */
const pools: Map<string, Sql> = new Map();

/**
 * Get a database client from the connection pool
 *
 * This follows AWS Lambda best practices by:
 * 1. Reusing connections across invocations
 * 2. Implementing proper error handling
 * 3. Setting appropriate timeouts
 */
export const getDbClient = async (connectionString: string): Promise<Sql> => {
	if (!connectionString) {
		throw new Error("Database connection string is missing, undefined, or invalid.");
	}

	let adjustedConnectionString = connectionString;
	if (
		process.env.AWS_SAM_LOCAL === "true" &&
		(connectionString.includes("localhost") || connectionString.includes("127.0.0.1"))
	) {
		adjustedConnectionString = connectionString
			.replace(/localhost/g, "host.docker.internal")
			.replace(/127\.0\.0\.1/g, "host.docker.internal");
	}

	if (!pools.has(adjustedConnectionString)) {
		const sql = postgres(adjustedConnectionString, {
			max: 10,
			idle_timeout: 30,
			connect_timeout: 3,
		});
		pools.set(adjustedConnectionString, sql);
	}

	const sql = pools.get(adjustedConnectionString);
	if (!sql) {
		throw new Error("Database pool was not initialized correctly for the given connection string.");
	}

	return sql;
};

export const closeDbClient = async (_sql: Sql): Promise<void> => {
	// No-op: postgres.js manages pooling internally, use shutdownPool to close all
};

export const executeTransaction = async <T>(
	sql: Sql,
	callback: (tx: Sql) => Promise<T>
): Promise<T> => {
	const result = await sql.begin(callback);
	return result as T;
};

export const generateInsertStatement = <T extends Record<string, unknown>>(
	tableName: string,
	data: T
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
 * Gracefully shut down the connection pool
 *
 * This should be called when you need to completely shut down all connections,
 * such as during testing or when implementing a Lambda extension that needs
 * to clean up resources before container shutdown.
 */
export const shutdownPool = async (): Promise<void> => {
	if (pools.size > 0) {
		for (const sql of pools.values()) {
			await sql.end();
		}
		pools.clear();
	}
};

export class NotificationsLogger {
	constructor(private sql: Sql) {}

	public async logNotification(
		user: User,
		notificationType: NotificationField,
		status: "sent" | "failed",
		messageSid?: string,
		errorMessage?: string
	): Promise<void> {
		try {
			const now = new Date();
			await this.sql`
				INSERT INTO notifications_log (
					user_id, city_id, type, sent_at,
					status, message
				) VALUES (${user.user_id}, ${user.city_id}, ${notificationType}, ${now}, ${status}, ${status === "sent" ? messageSid : errorMessage})
			`;
		} catch (e) {
			console.error("Failed to log notification to database:", e);
			// Do not re-throw, logging failure should not cause the main flow to fail
		}
	}
}
