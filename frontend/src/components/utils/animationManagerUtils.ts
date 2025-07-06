/**
 * Animation Manager Utilities
 * Provides a centralized manager for coordinating different types of animations
 */

import { createTextBubbleAnimation } from "./animationUtils";

interface AnimationManagerOptions {
	containerSelector?: string;
}

/**
 * Creates an animation manager to coordinate different animations
 * @param options Configuration options
 * @returns Object with methods to manage animations
 */
export function createAnimationManager(_options: AnimationManagerOptions = {}) {
	// Create the manager object
	const manager = {
		/**
		 * Clean up any existing animations
		 */
		cleanup: () => {
			// Remove text bubble animation container
			const existingContainer = document.getElementById(
				"text_bubble_animation",
			);
			if (existingContainer) {
				existingContainer.remove();
			}
		},

		/**
		 * Initialize or reinitialize animations
		 */
		initAnimations: () => {
			// First clean up any existing animations
			manager.cleanup();
		},

		/**
		 * Play success animation
		 * @param onComplete Optional callback to run when animation completes
		 * @param config Optional configuration for the animation
		 * @returns Duration of the animation
		 */
		playSuccessAnimation: (onComplete?: () => void, config = {}) => {
			const animationConfig = {
				duration: 6000, // Default animation duration in milliseconds
				...config,
			};

			const animationDuration = createTextBubbleAnimation(animationConfig);

			if (onComplete) {
				setTimeout(onComplete, animationDuration);
			}

			return animationDuration;
		},
	};

	// Auto-initialize in browser environment
	if (typeof document !== "undefined") {
		// Use setTimeout to ensure DOM is ready
		setTimeout(() => {
			manager.initAnimations();
		}, 0);
	}

	return manager;
}