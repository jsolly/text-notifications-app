/**
 * Interface for the validation utilities returned by setupFormValidation
 */
interface ValidationUtils {
	isFormValid: (isPhoneValid: boolean, isCityValid: boolean) => boolean;
	updateSubmitButton: () => void;
	getValidationStatus: (
		isPhoneValid: boolean,
		isCityValid: boolean,
	) => ValidationStatus;
	onTurnstileCallback: (token: string) => void;
	highlightInvalidFields: (isPhoneValid: boolean, isCityValid: boolean) => void;
}

/**
 * Configuration for the form validation setup
 */
interface FormValidationConfig {
	setPhoneValid: (isValid: boolean) => void;
	setCityValid: (isValid: boolean) => void;
}

/**
 * Interface for validation status result
 */
export interface ValidationStatus {
	isValid: boolean;
	validationState: {
		phone: { isValid: boolean; label: string };
		city: { isValid: boolean; label: string };
	};
}

/**
 * Sets up validation event listeners for form fields
 * @param config - Configuration object containing validation state setters
 * @returns Object containing validation state and utility functions
 */
export function setupFormValidation(
	config: FormValidationConfig,
): ValidationUtils {
	const { setPhoneValid, setCityValid } = config;

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

	// Turnstile callback function - kept separate from validation logic
	function onTurnstileCallback(token: string): void {
		const form = document.getElementById("signup-form");
		if (form) {
			form.setAttribute(
				"hx-headers",
				JSON.stringify({
					"cf-turnstile-response": token,
				}),
			);
		}
	}

	// Check if all form fields are valid
	function isFormValid(isPhoneValid: boolean, isCityValid: boolean): boolean {
		return isPhoneValid && isCityValid;
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

	/**
	 * Gets the validation status for all inputs
	 * @param isPhoneValid - Whether the phone number is valid
	 * @param isCityValid - Whether the city is valid
	 * @returns Validation status object with overall validity and detailed state
	 */
	function getValidationStatus(
		isPhoneValid: boolean,
		isCityValid: boolean,
	): ValidationStatus {
		// Create validation state object
		const validationState = {
			phone: { isValid: isPhoneValid, label: "valid phone number" },
			city: { isValid: isCityValid, label: "city" },
		};

		return {
			isValid: isPhoneValid && isCityValid, // Overall form validity
			validationState,
		};
	}

	/**
	 * Highlights invalid fields with a red border
	 * @param isPhoneValid - Whether the phone number is valid
	 * @param isCityValid - Whether the city is valid
	 */
	function highlightInvalidFields(
		isPhoneValid: boolean,
		isCityValid: boolean,
	): void {
		// Add a custom event to highlight the phone input if invalid
		if (!isPhoneValid) {
			document.dispatchEvent(new CustomEvent("highlight-phone-error"));
		}

		// Add a custom event to highlight the city input if invalid
		if (!isCityValid) {
			document.dispatchEvent(new CustomEvent("highlight-city-error"));
		}
	}

	return {
		isFormValid,
		updateSubmitButton,
		getValidationStatus,
		onTurnstileCallback,
		highlightInvalidFields,
	};
}
