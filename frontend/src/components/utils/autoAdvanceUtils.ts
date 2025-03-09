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
	 */
	const setupAutoAdvance = () => {
		// Handle input completion for text inputs
		document.addEventListener("input", (event) => {
			const target = event.target as HTMLInputElement;

			// Only process certain input types that aren't freeform text fields
			if (!target || !["tel", "email"].includes(target.type)) {
				return;
			}

			// We're no longer auto-advancing for the name field since it's freeform
			// Users should be able to complete typing their full name
		});

		// Handle phone number completion
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

		// Handle city selection
		document.addEventListener("city_validation_change", (event) => {
			const customEvent = event as CustomEvent;
			if (customEvent.detail?.isValid) {
				const cityInput = document.getElementById("city_search");
				if (cityInput) {
					const nextElement = findNextFocusableElement(cityInput);
					if (nextElement) {
						(nextElement as HTMLElement).focus();
					}
				}
			}
		});

		// Handle select elements change
		document.addEventListener("change", (event) => {
			const target = event.target as HTMLSelectElement;

			if (target.tagName === "SELECT") {
				const nextElement = findNextFocusableElement(target);
				if (nextElement) {
					(nextElement as HTMLElement).focus();
				}
			}
		});
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
