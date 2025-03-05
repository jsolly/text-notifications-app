import type { Client } from "pg";

export interface UserQueryResult {
	user_id: string;
}

export type DbClient = Client;
