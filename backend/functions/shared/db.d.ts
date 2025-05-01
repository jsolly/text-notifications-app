import type pg from "pg";
/**
 * Get a database client from the connection pool
 *
 * This follows AWS Lambda best practices by:
 * 1. Reusing connections across invocations
 * 2. Implementing proper error handling
 * 3. Setting appropriate timeouts
 */
export declare const getDbClient: (
	connectionString: string,
) => Promise<pg.PoolClient>;
export declare const executeTransaction: <T>(
	client: pg.PoolClient,
	callback: () => Promise<T>,
) => Promise<T>;
export declare const generateInsertStatement: <
	T extends Record<string, unknown>,
>(
	tableName: string,
	data: T,
) => {
	sql: string;
	params: unknown[];
};
/**
 * Safely release a database client back to the pool
 *
 * In Lambda functions, it's critical to release connections properly
 * to avoid connection leaks across invocations.
 */
export declare const closeDbClient: (client: pg.PoolClient) => void;
/**
 * Gracefully shut down the connection pool
 *
 * This should be called when you need to completely shut down all connections,
 * such as during testing or when implementing a Lambda extension that needs
 * to clean up resources before container shutdown.
 */
export declare const shutdownPool: () => Promise<void>;
//# sourceMappingURL=db.d.ts.map
