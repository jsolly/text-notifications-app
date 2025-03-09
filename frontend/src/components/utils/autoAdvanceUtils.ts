/**
 * Auto-advance utility
 * Provides functionality to automatically advance focus to the next form element
 */

/**
 * Creates and sets up auto-advance functionality for form elements
 * @returns Object with setup function
 */
export function createAutoAdvanceManager() {
	// Get all focusable elements in the form
	const getFocusableElements = () => {
		const form = document.getElementById("signup_form");
		if (!form) return [];

		return Array.from(
			form.querySelectorAll(
				'input:not([type="hidden"]):not([disabled]), select, textarea, button:not([disabled])',
			),
		).filter((el) => {
			// Ensure element is visible
			const style = window.getComputedStyle(el);
			return style.display !== "none" && style.visibility !== "hidden";
		});
	};

	// Find the next element to focus after the current one
	const findNextFocusableElement = (
		currentElement: Element,
	): Element | null => {
		const focusableElements = getFocusableElements();
		const currentIndex = focusableElements.indexOf(
			currentElement as HTMLElement,
		);

		if (currentIndex === -1 || currentIndex === focusableElements.length - 1) {
			return null;
		}

		return focusableElements[currentIndex + 1];
	};

	/**
	 * Sets up all event listeners for auto-advancing between form fields
	 * Only the phone input will auto-advance to the next field
	 */
	const setupAutoAdvance = () => {
		// Handle phone number completion - only field that should auto-advance
		document.addEventListener("phone_validation_change", (event) => {
			const customEvent = event as CustomEvent;
			if (customEvent.detail?.isValid) {
				const phoneInput = document.getElementById("phone_number");
				if (phoneInput) {
					const nextElement = findNextFocusableElement(phoneInput);
					if (nextElement) {
						(nextElement as HTMLElement).focus();
					}
				}
			}
		});

		// No auto-advance for other fields
	};

	// Create the manager object
	const manager = {
		setupAutoAdvance,
	};

	// Auto-initialize in browser environment
	if (typeof document !== "undefined") {
		// Use setTimeout to ensure DOM is ready
		setTimeout(() => {
			setupAutoAdvance();
		}, 0);
	}

	return manager;
}
