import pg from "pg";
const { Pool } = pg;
import type { PoolClient as PgClient } from "pg";
import type { NotificationField } from "@text-notifications/shared";

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

		pool.on("error", (err: Error) => {
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

export class NotificationsLogger {
	constructor(private client: PgClient) {}

	public async logNotification(
		user: User,
		notificationType: NotificationField,
		status: "sent" | "failed",
		messageSid?: string,
		errorMessage?: string,
	): Promise<void> {
		try {
			const now = new Date();
			await this.client.query(
				`
				INSERT INTO notifications_log (
					user_id, city_id, type, sent_at,
					status, message
				) VALUES ($1, $2, $3, $4, $5, $6)
				`,
				[
					user.user_id,
					user.city_id,
					notificationType,
					now, // when we attempted to notify
					status, // sent or failed
					status === "sent" ? messageSid : errorMessage,
				],
			);
		} catch (e) {
			console.error("Failed to log notification to database:", e);
			// Do not re-throw, logging failure should not cause the main flow to fail
		}
	}
}
