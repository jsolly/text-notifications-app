import { Client } from "pg";

export const getDbClient = async (): Promise<Client> => {
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});
	await client.connect();
	return client;
};
