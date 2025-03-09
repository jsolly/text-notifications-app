import pg from "pg";
const { Client } = pg;

export const getDbClient = async (): Promise<pg.Client> => {
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});
	await client.connect();
	return client;
};

export const executeTransaction = async <T>(
	client: pg.Client,
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

export const closeDbClient = async (client: pg.Client): Promise<void> => {
	await client.end();
};
