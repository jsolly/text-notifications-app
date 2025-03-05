import type { Pool, QueryResult } from "pg";

export interface UserQueryResult {
	user_id: string;
}

export type DbClient = Pool;
