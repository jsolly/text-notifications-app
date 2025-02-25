/**
 * Interface for a validation field state
 */
export interface ValidationField {
	isValid: boolean;
	label: string;
}

/**
 * Interface for the validation state object
 */
export interface ValidationState {
	[key: string]: ValidationField;
}

/**
 * Type for toast notification types
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Interface for toast notification event detail
 */
export interface ToastEventDetail {
	message: string;
	type: ToastType;
}

/**
 * Creates a toast notification event for validation errors
 * @param validationState - Object containing validation states for different fields
 * @returns A custom event that can be dispatched to show a toast, or null if all fields are valid
 */
export function createValidationToast(
	validationState: ValidationState,
): CustomEvent<ToastEventDetail> | null {
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
 * @param message - The message to display in the toast
 * @param type - The type of toast (success, error, warning, info)
 * @returns A custom event that can be dispatched to show a toast
 */
export function createToast(
	message: string,
	type: ToastType = "info",
): CustomEvent<ToastEventDetail> {
	return new CustomEvent("toast-show", {
		detail: { message, type },
	});
}
