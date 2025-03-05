import { Client } from "pg";
import type { DbClient } from "./types.js";

/**
 * Gets a database client
 * @returns A PostgreSQL client configured for serverless use with Neon
 */
export const getDbClient = (): DbClient => {
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});
	// Connect immediately to validate the connection
	client.connect();
	return client;
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
 * Closes the database client connection
 * @param client The database client to close
 */
export const closeDbClient = async (client: DbClient): Promise<void> => {
	await client.end();
};
