/**
 * Parses form data into a typed object based on a schema
 * @param formData The URLSearchParams object containing form data
 * @param schema The schema object defining the structure
 * @returns An object with the parsed form data
 */
export const parseSchemaFields = <T extends string>(
	formData: URLSearchParams,
	schema: Record<string, unknown>
): { [K in T]: string } => {
	return Object.keys(schema).reduce(
		(acc, key) => {
			const field = key as T;
			const value = formData.get(key);
			acc[field] = value || "";
			return acc;
		},
		{} as { [K in T]: string }
	);
};

/**
 * Parses notification preferences from form data
 * @param formData The URLSearchParams object containing form data
 * @param schema The notification schema object
 * @returns An object with boolean flags for each notification type
 */
export const parseNotificationPreferences = <T extends string>(
	formData: URLSearchParams,
	schema: Record<string, unknown>
): { [K in T]: boolean } => {
	return Object.keys(schema).reduce(
		(acc, key) => {
			// Check if the notification field exists with a value of "true"
			acc[key as T] = formData.get(key) === "true";
			return acc;
		},
		{} as { [K in T]: boolean }
	);
};
