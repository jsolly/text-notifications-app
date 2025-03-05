// Browser-safe stubs for database functions
export const getDbClient = () => {
	throw new Error("Database functions are not available in the browser");
};

export const executeTransaction = () => {
	throw new Error("Database functions are not available in the browser");
};

export const generateInsertStatement = () => {
	throw new Error("Database functions are not available in the browser");
};

export const generateNotificationPreferencesInsert = () => {
	throw new Error("Database functions are not available in the browser");
};

export interface UserQueryResult {
	user_id: string;
}
