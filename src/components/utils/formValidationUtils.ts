/**
 * Interface for the validation utilities returned by setupFormValidation
 */
interface ValidationUtils {
	onTurnstileCallback: (token: string) => void;
	isFormValid: (isPhoneValid: boolean, isCityValid: boolean) => boolean;
	updateSubmitButton: () => void;
	showValidationMessage: (isPhoneValid: boolean, isCityValid: boolean) => void;
	validateField: (
		condition: boolean,
		fieldName: string,
		element: Element | null,
	) => boolean;
	isTurnstileValid: boolean;
}

/**
 * Configuration for the form validation setup
 */
interface FormValidationConfig {
	setPhoneValid: (isValid: boolean) => void;
	setCityValid: (isValid: boolean) => void;
	isDev: boolean;
}

/**
 * Sets up validation event listeners for form fields
 * @param config - Configuration object containing validation state setters
 * @returns Object containing validation state and utility functions
 */
export function setupFormValidation(
	config: FormValidationConfig,
): ValidationUtils {
	const { setPhoneValid, setCityValid, isDev } = config;
	let isTurnstileValid = isDev; // Set to true in dev mode

	// Generic function to handle validation changes
	function setupValidationListener(
		eventName: string,
		validationSetter: (isValid: boolean) => void,
	): void {
		document.addEventListener(eventName, ((event: CustomEvent) => {
			validationSetter(event.detail.isValid);
			console.log(`${eventName} changed:`, event.detail.isValid);
			updateSubmitButton();
		}) as EventListener);
	}

	// Setup validation listeners
	setupValidationListener("phone-validation-change", setPhoneValid);
	setupValidationListener("city-validation-change", setCityValid);

	// Turnstile callback function
	function onTurnstileCallback(token: string): void {
		isTurnstileValid = true;
		const form = document.getElementById("signup-form");
		if (form) {
			form.setAttribute(
				"hx-headers",
				JSON.stringify({
					"cf-turnstile-response": token,
				}),
			);
		}
		updateSubmitButton();
	}

	// Check if all form fields are valid
	function isFormValid(isPhoneValid: boolean, isCityValid: boolean): boolean {
		return isPhoneValid && isCityValid && (isDev || isTurnstileValid);
	}

	// Update submit button state based on form validity
	function updateSubmitButton(): void {
		const submitButton = document.getElementById("submit-button");
		if (!submitButton) return;

		if (!isFormValid(false, false)) {
			// This is just for the button state check
			submitButton.classList.remove("hover:bg-blue-700");
		} else {
			submitButton.classList.add("hover:bg-blue-700");
		}
	}

	// Show validation message for invalid fields
	function showValidationMessage(
		isPhoneValid: boolean,
		isCityValid: boolean,
	): void {
		const validationState = {
			phone: { isValid: isPhoneValid, label: "valid phone number" },
			city: { isValid: isCityValid, label: "city" },
			turnstile: {
				isValid: isDev || isTurnstileValid,
				label: "Turnstile verification",
			},
		};

		// Dispatch an event for the toast utility to handle
		const validationEvent = new CustomEvent("validation-check", {
			detail: validationState,
		});
		window.dispatchEvent(validationEvent);
	}

	// Helper function to check a specific validation condition
	function validateField(
		condition: boolean,
		fieldName: string,
		element: Element | null,
	): boolean {
		if (element && !condition) {
			console.log(`${fieldName} validation failed`);
			return false;
		}
		return true;
	}

	return {
		onTurnstileCallback,
		isFormValid,
		updateSubmitButton,
		showValidationMessage,
		validateField,
		isTurnstileValid,
	};
}
