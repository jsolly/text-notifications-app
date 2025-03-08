/**
 * Button State Management Utilities
 * Provides functions to manage button UI states
 */

interface ButtonStateOptions {
	buttonId?: string;
	loadingText?: string;
	defaultText?: string;
	defaultClassName?: string;
}

/**
 * Creates a button state manager
 * @param options Configuration options
 * @returns Object with methods to manage button states
 */
export function createButtonStateManager(options: ButtonStateOptions = {}) {
	const {
		buttonId = "submit-button",
		loadingText = "Submitting...",
		defaultText = "Sign Up for Notifications",
		defaultClassName = "w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium shadow-md",
	} = options;

	return {
		/**
		 * Set button to loading state
		 */
		setLoading: () => {
			const button = document.getElementById(buttonId) as HTMLButtonElement;
			if (button) {
				button.innerHTML = loadingText;
				button.disabled = true;
				button.classList.add("opacity-75", "cursor-not-allowed");
			}
		},

		/**
		 * Reset button to default state
		 */
		reset: () => {
			const button = document.getElementById(buttonId) as HTMLButtonElement;
			if (button) {
				button.className = defaultClassName;
				button.innerHTML = defaultText;
				button.disabled = false;
				button.removeAttribute("data-error");
				button.removeAttribute("data-success");
			}
		},

		/**
		 * Get a button element by its ID
		 * @returns The button element or null if not found
		 */
		getButton: () => {
			return document.getElementById(buttonId) as HTMLButtonElement;
		},
	};
}
