import pg from "pg";
const { Pool } = pg;
import type { PoolClient as PgClient } from "pg";
import type { Notification as NotificationType } from "@text-notifications/shared";

export interface User {
	user_id: string;
	full_phone: string;
	language: string;
	name: string;
	city_id?: string;
}

/**
 * Database connection pool - maintained across Lambda invocations within the same container
 *
 * In AWS Lambda, the code outside the handler function executes only when the container
 * is initialized. This creates a connection pool that's reused across multiple invocations
 * handled by the same container instance, improving performance.
 */
const pools: Map<string, pg.Pool> = new Map();

/**
 * Get a database client from the connection pool
 *
 * This follows AWS Lambda best practices by:
 * 1. Reusing connections across invocations
 * 2. Implementing proper error handling
 * 3. Setting appropriate timeouts
 */
export const getDbClient = async (
	connectionString: string,
): Promise<pg.PoolClient> => {
	let adjustedConnectionString = connectionString;
	if (
		process.env.AWS_SAM_LOCAL === "true" &&
		(connectionString.includes("localhost") ||
			connectionString.includes("127.0.0.1"))
	) {
		adjustedConnectionString = connectionString
			.replace(/localhost/g, "host.docker.internal")
			.replace(/127\.0\.0\.1/g, "host.docker.internal");
	}

	if (!pools.has(adjustedConnectionString)) {
		const pool = new Pool({
			connectionString: adjustedConnectionString,
			max: 10,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 3000,
		});

		pool.on("error", (err) => {
			console.error("Unexpected error on idle client", err);
			pools.delete(adjustedConnectionString);
		});

		pools.set(adjustedConnectionString, pool);
	}

	const pool = pools.get(adjustedConnectionString);
	if (!pool) {
		throw new Error(
			"Database pool was not initialized correctly for the given connection string.",
		);
	}

	try {
		const client = await pool.connect();
		const timeoutId = setTimeout(() => {
			console.warn("Database operation timeout - releasing connection");
			client.release(true);
		}, 10000);

		const originalRelease = client.release;
		client.release = () => {
			clearTimeout(timeoutId);
			return originalRelease.apply(client);
		};

		return client;
	} catch (error: unknown) {
		console.error("Database connection failed:", error);
		pools.delete(adjustedConnectionString);
		throw new Error(
			`Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
};

export const closeDbClient = (client: pg.PoolClient): void => {
	client.release();
};

export const executeTransaction = async <T>(
	client: pg.PoolClient,
	callback: () => Promise<T>,
): Promise<T> => {
	try {
		await client.query("BEGIN");
		const result = await callback();
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
};

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
 * Gracefully shut down the connection pool
 *
 * This should be called when you need to completely shut down all connections,
 * such as during testing or when implementing a Lambda extension that needs
 * to clean up resources before container shutdown.
 */
export const shutdownPool = async (): Promise<void> => {
	if (pools.size > 0) {
		for (const pool of pools.values()) {
			await pool.end();
		}
		pools.clear();
	}
};

class NotificationsLogger {
	constructor(private client: PgClient) {
		// REMOVED: Old connectionString initialization
	}

	public async logNotification(
		user: User,
		notificationType: NotificationType,
		status: "pending" | "sent" | "failed",
		messageSid?: string,
		errorMessage?: string,
		// REMOVED: existingClient?: PgClient,
	): Promise<void> {
		// REMOVED: Logic for checking connectionString or existingClient
		// REMOVED: Logic for manageClientLocally, getDbClient, closeDbClient within this method

		if (!this.client) {
			// Should ideally not happen if constructor enforces it
			console.error(
				"NotificationsLogger not initialized with a database client. Skipping log.",
			);
			return;
		}

		try {
			const now = new Date();
			await this.client.query(
				// MODIFIED: Uses this.client
				`
				INSERT INTO notifications_log (
					user_id, city_id, notification_type, notification_time,
					sent_time, delivery_status, response_message
				) VALUES ($1, $2, $3, $4, $5, $6, $7)
				`,
				[
					user.user_id,
					user.city_id,
					notificationType,
					now, // notification_time is when we attempt to log pending
					status === "pending" ? null : now, // sent_time is only set if not pending
					status,
					status === "sent" ? messageSid : errorMessage,
				],
			);
		} catch (e) {
			console.error("Failed to log notification to database:", e);
			// Do not re-throw, logging failure should not break main flow
		}
		// REMOVED: finally block that handled client release, as this logger no longer manages client lifecycle
	}
}

export { NotificationsLogger }; // EXPORTING THE CLASS ITSELF
