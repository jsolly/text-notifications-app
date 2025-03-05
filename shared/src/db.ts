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
