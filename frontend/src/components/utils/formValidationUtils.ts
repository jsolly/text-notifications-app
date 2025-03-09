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
	// Track validation state internally
	let phoneValid = false;
	let cityValid = false;

	// Generic function to handle validation changes
	function setupValidationListener(
		eventName: string,
		validationSetter: (isValid: boolean) => void,
	): void {
		document.addEventListener(eventName, ((event: CustomEvent) => {
			// Update internal state
			if (eventName === "phone_validation_change") {
				phoneValid = event.detail.isValid;
			} else if (eventName === "city_validation_change") {
				cityValid = event.detail.isValid;
			}

			// Update external state via config
			validationSetter(event.detail.isValid);

			// Update button state
			updateSubmitButton();
		}) as EventListener);
	}

	// Setup validation listeners for phone and city
	function setupValidationListeners(): void {
		setupValidationListener("phone_validation_change", config.setPhoneValid);
		setupValidationListener("city_validation_change", config.setCityValid);

		// Get the form element
		const form = document.getElementById("signup_form");
		if (!form) return;
	}

	// Call setupValidationListeners to register the event listeners
	setupValidationListeners();

	// Turnstile callback function - kept separate from validation logic
	function onTurnstileCallback(token: string): void {
		const form = document.getElementById("signup_form");
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
		const submitButton = document.getElementById("submit_button");
		if (!submitButton) return;

		// Use the internal tracking variables
		if (!isFormValid(phoneValid, cityValid)) {
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
		if (!isPhoneValid) {
			document.dispatchEvent(new CustomEvent("highlight_phone_error"));
		}

		if (!isCityValid) {
			document.dispatchEvent(new CustomEvent("highlight_city_error"));
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
