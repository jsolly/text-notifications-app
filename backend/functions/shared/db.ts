import pg from "pg";
const { Pool } = pg;

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
	// Adjust connection string for SAM local development environment if needed
	// This is because SAM local runs in a Docker container and needs to connect to the host machine
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

	// Initialize pool for this connection string if not already created
	if (!pools.has(adjustedConnectionString)) {
		const pool = new Pool({
			connectionString: adjustedConnectionString,
			max: 10, // Allow multiple concurrent connections if needed
			idleTimeoutMillis: 30000, // 30 seconds - more appropriate for Lambda
			connectionTimeoutMillis: 3000, // 3 seconds connection timeout
		});

		// Log pool errors
		pool.on("error", (err) => {
			console.error("Unexpected error on idle client", err);
			// If the pool encounters a critical error, we'll recreate it on next invocation
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
		// Get client from pool
		const client = await pool.connect();

		// Add a timeout to ensure connections don't hang
		const timeoutId = setTimeout(() => {
			console.warn("Database operation timeout - releasing connection");
			client.release(true); // Force release with an error
		}, 10000); // 10 second timeout

		// Override the release method to clear the timeout
		const originalRelease = client.release;
		client.release = () => {
			clearTimeout(timeoutId);
			return originalRelease.apply(client);
		};

		return client;
	} catch (error: unknown) {
		console.error("Database connection failed:", error);
		// If we can't connect, the pool might be in a bad state
		pools.delete(adjustedConnectionString);
		throw new Error(
			`Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
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
 * Safely release a database client back to the pool
 *
 * In Lambda functions, it's critical to release connections properly
 * to avoid connection leaks across invocations.
 */
export const closeDbClient = (client: pg.PoolClient): void => {
	// Release the client back to the pool
	client.release();
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
