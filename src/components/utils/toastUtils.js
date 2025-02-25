/**
 * Creates a toast notification event for validation errors
 * @param {Object} validationState - Object containing validation states for different fields
 * @returns {CustomEvent} - A custom event that can be dispatched to show a toast
 */
export function createValidationToast(validationState) {
	const missingFields = Object.values(validationState)
		.filter((field) => !field.isValid)
		.map((field) => field.label);

	if (missingFields.length === 0) return null;

	const message = `Please provide a ${missingFields.join(" and ")} before submitting.`;
	console.log("Creating validation toast message:", message);

	return new CustomEvent("toast-show", {
		detail: { message, type: "error" },
	});
}

/**
 * Creates a generic toast notification event
 * @param {string} message - The message to display in the toast
 * @param {string} type - The type of toast (success, error, warning, info)
 * @returns {CustomEvent} - A custom event that can be dispatched to show a toast
 */
export function createToast(message, type = "info") {
	return new CustomEvent("toast-show", {
		detail: { message, type },
	});
}
