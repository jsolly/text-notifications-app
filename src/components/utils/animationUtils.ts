/**
 * Text Bubble Animation Utility
 * Creates a fun animation of floating text message bubbles when signup is successful
 */

interface TextBubbleOptions {
	count?: number;
	colors?: string[];
	duration?: number;
	container?: HTMLElement;
	messages?: string[];
	respectReducedMotion?: boolean;
}

// Default animation configuration
const DEFAULT_ANIMATION_DURATION = 6000;
const DEFAULT_COUNT = 60;
const DEFAULT_COLORS = ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE"];
const DEFAULT_MESSAGES = [
	"Welcome!",
	"Thanks for signing up!",
	"You're all set!",
	"Notifications enabled",
	"Stay updated",
	"Never miss an update",
	"Text notifications ready",
	"You'll receive updates soon",
	"Important alerts coming your way",
	"Stay in the loop",
	"👋",
	"📱",
	"✅",
	"🎉",
	"📲",
	"💬",
];

/**
 * Checks if user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Creates a container for the animation
 * @param container The parent container
 * @returns The animation container element
 */
function createAnimationContainer(container: HTMLElement): HTMLDivElement {
	const animationContainer = document.createElement("div");
	animationContainer.style.position = "fixed";
	animationContainer.style.top = "0";
	animationContainer.style.left = "0";
	animationContainer.style.width = "100%";
	animationContainer.style.height = "100%";
	animationContainer.style.pointerEvents = "none";
	animationContainer.style.zIndex = "9999";
	animationContainer.id = "text-bubble-animation";

	container.appendChild(animationContainer);
	return animationContainer;
}

/**
 * Creates a subtle background effect
 * @param animationContainer The animation container
 * @param duration Animation duration
 * @returns The background effect element
 */
function createBackgroundEffect(
	animationContainer: HTMLDivElement,
	duration: number,
): HTMLDivElement {
	const backgroundEffect = document.createElement("div");
	backgroundEffect.style.position = "absolute";
	backgroundEffect.style.top = "0";
	backgroundEffect.style.left = "0";
	backgroundEffect.style.width = "100%";
	backgroundEffect.style.height = "100%";
	backgroundEffect.style.backgroundColor = "rgba(79, 70, 229, 0.05)";
	backgroundEffect.style.opacity = "0";
	backgroundEffect.style.transition = "opacity 0.5s ease";

	animationContainer.appendChild(backgroundEffect);

	// Fade in the background
	setTimeout(() => {
		backgroundEffect.style.opacity = "1";
	}, 10);

	// Fade out the background at the end
	setTimeout(() => {
		backgroundEffect.style.opacity = "0";
	}, duration - 500);

	return backgroundEffect;
}

/**
 * Creates and animates text bubbles
 * @export
 * @param options Animation options
 * @param options.duration Duration of the animation in milliseconds (defaults to 6000ms if not provided)
 * @param options.count Number of bubbles to create
 * @param options.colors Array of colors to use for the bubbles
 * @param options.messages Array of messages to display in the bubbles
 * @param options.container DOM element to append the animation to
 * @param options.respectReducedMotion Whether to respect user's reduced motion preference
 * @returns Animation duration in ms (same as input duration or default)
 */
export function createTextBubbleAnimation(
	options: TextBubbleOptions = {},
): number {
	const {
		count = DEFAULT_COUNT,
		colors = DEFAULT_COLORS,
		duration = DEFAULT_ANIMATION_DURATION, // Frontend can override this default
		container = document.body,
		messages = DEFAULT_MESSAGES,
		respectReducedMotion = true,
	} = options;

	// Check if user prefers reduced motion
	if (respectReducedMotion && prefersReducedMotion()) {
		// Provide a simplified, less animated experience
		const simpleNotification = document.createElement("div");
		simpleNotification.style.position = "fixed";
		simpleNotification.style.top = "20px";
		simpleNotification.style.left = "50%";
		simpleNotification.style.transform = "translateX(-50%)";
		simpleNotification.style.padding = "15px 20px";
		simpleNotification.style.backgroundColor = colors[0];
		simpleNotification.style.color = "white";
		simpleNotification.style.borderRadius = "8px";
		simpleNotification.style.fontWeight = "bold";
		simpleNotification.style.zIndex = "9999";
		simpleNotification.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
		simpleNotification.style.opacity = "0";
		simpleNotification.style.transition = "opacity 0.3s ease";
		simpleNotification.textContent = messages[0]; // Just use the first message

		container.appendChild(simpleNotification);

		setTimeout(() => {
			simpleNotification.style.opacity = "1";
		}, 10);

		setTimeout(() => {
			simpleNotification.style.opacity = "0";
			setTimeout(() => {
				container.removeChild(simpleNotification);
			}, 300);
		}, duration - 300);

		return duration;
	}

	// Create the animation container
	const animationContainer = createAnimationContainer(container);

	// Add background effect
	createBackgroundEffect(animationContainer, duration);

	// Create the text bubbles with staggered animation
	createBubbles(animationContainer, count, colors, messages, duration);

	return duration;
}

/**
 * Creates animated text bubbles
 * @param container The animation container
 * @param count Number of bubbles to create
 * @param colors Array of colors to use
 * @param messages Array of messages to display
 * @param duration Animation duration
 */
function createBubbles(
	container: HTMLDivElement,
	count: number,
	colors: string[],
	messages: string[],
	duration: number,
): void {
	// Adjust bubble count for smaller screens
	const adjustedCount =
		window.innerWidth < 768 ? Math.floor(count * 0.6) : count;

	for (let i = 0; i < adjustedCount; i++) {
		setTimeout(() => {
			const bubble = document.createElement("div");

			// Configure bubble appearance and animation
			configureBubble(bubble, colors, messages);

			// Animate the bubble
			animateBubble(bubble, container, duration);
		}, Math.random() * 600); // Stagger the bubble creation
	}
}

/**
 * Configures a bubble's appearance
 * @param bubble The bubble element
 * @param colors Array of colors to choose from
 * @param messages Array of messages to choose from
 */
function configureBubble(
	bubble: HTMLDivElement,
	colors: string[],
	messages: string[],
): void {
	// Randomly choose if this is a sent or received message bubble
	const isSent = Math.random() > 0.5;

	// Set bubble styles
	bubble.style.position = "absolute";
	bubble.style.borderRadius = isSent ? "20px 20px 0 20px" : "20px 20px 20px 0";
	bubble.style.padding = "10px 15px";
	bubble.style.fontSize = `${Math.random() * 10 + 10}px`;
	bubble.style.backgroundColor =
		colors[Math.floor(Math.random() * colors.length)];
	bubble.style.color = "white";
	bubble.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
	bubble.style.opacity = "0";
	bubble.style.transform = "scale(0)";

	// Add a random message from the messages array
	const messageIndex = Math.floor(Math.random() * messages.length);
	const message = messages[messageIndex];

	// Determine if we should show an icon or text
	const showIcon = message.length === 2 && /\p{Emoji}/u.test(message);

	if (showIcon) {
		bubble.style.fontSize = `${Math.random() * 15 + 20}px`;
		bubble.textContent = message;
	} else {
		bubble.textContent = message;
	}
}

/**
 * Animates a bubble through its lifecycle
 * @param bubble The bubble element
 * @param container The container element
 * @param duration Total animation duration
 */
function animateBubble(
	bubble: HTMLDivElement,
	container: HTMLDivElement,
	duration: number,
): void {
	// Determine starting position (bottom, left, or right of screen)
	const startPosition = Math.floor(Math.random() * 3); // 0: bottom, 1: left, 2: right
	let startX: number;
	let startY: number;

	switch (startPosition) {
		case 0: // Bottom
			startX = Math.random() * window.innerWidth;
			startY = window.innerHeight + 50;
			break;
		case 1: // Left
			startX = -100;
			startY = Math.random() * window.innerHeight;
			break;
		case 2: // Right
			startX = window.innerWidth + 100;
			startY = Math.random() * window.innerHeight;
			break;
	}

	// Create a multi-stage animation path
	// First stage: Explosion outward and upward
	const midX = startX + (Math.random() * 400 - 200);
	const midY = startY - Math.random() * window.innerHeight * 0.6;

	// Second stage: Drift back down
	const endX = midX + (Math.random() * 200 - 100);
	const endY = midY + Math.random() * window.innerHeight * 0.3;

	// Set initial position
	bubble.style.left = `${startX}px`;
	bubble.style.top = `${startY}px`;

	// Add to container
	container.appendChild(bubble);

	// First animation stage: Explode outward and upward
	setTimeout(() => {
		// Create a dynamic transition for the explosion phase
		bubble.style.transition =
			"opacity 0.3s ease-out, transform 0.5s cubic-bezier(0.1, 0.9, 0.2, 1.1), left 0.8s cubic-bezier(0.2, 0.8, 0.3, 1), top 0.8s cubic-bezier(0.2, 0.8, 0.3, 1)";
		bubble.style.opacity = String(Math.random() * 0.5 + 0.5);
		bubble.style.transform = `scale(${Math.random() * 0.5 + 0.8})`;

		// Add rotation for a more dynamic effect
		const rotation = Math.random() * 30 - 15;
		bubble.style.transform += ` rotate(${rotation}deg)`;

		// Move to mid position (explosion phase)
		bubble.style.left = `${midX}px`;
		bubble.style.top = `${midY}px`;
	}, 10);

	// Second animation stage: Drift back down
	setTimeout(() => {
		// Create a gentler transition for the floating down phase
		const transitionDuration = duration / 2000;
		bubble.style.transition = `left ${transitionDuration}s cubic-bezier(0.4, 0, 0.6, 1), top ${transitionDuration}s cubic-bezier(0.4, 0, 0.6, 1), transform ${transitionDuration}s ease-in-out`;

		// Move to end position (drift down phase)
		bubble.style.left = `${endX}px`;
		bubble.style.top = `${endY}px`;

		// Add a slight size change and rotation adjustment
		const currentScale = Number.parseFloat(
			bubble.style.transform.match(/scale\(([^)]+)\)/)?.[1] || "1",
		);
		const newScale = currentScale * 0.9;
		const currentRotation =
			bubble.style.transform.match(/rotate\(([^)]+)\)/)?.[1] || "0deg";
		const newRotation =
			Number.parseFloat(currentRotation) + (Math.random() * 20 - 10);
		bubble.style.transform = `scale(${newScale}) rotate(${newRotation}deg)`;
	}, duration / 2);

	// Add a subtle pulsing effect to some bubbles
	if (Math.random() > 0.7) {
		const pulseInterval = setInterval(() => {
			const currentScale = Number.parseFloat(
				bubble.style.transform.match(/scale\(([^)]+)\)/)?.[1] || "1",
			);
			const newScale = currentScale * (Math.random() > 0.5 ? 1.1 : 0.95);

			// Update the transform while preserving rotation
			const currentRotation =
				bubble.style.transform.match(/rotate\(([^)]+)\)/)?.[1] || "0deg";
			bubble.style.transform = `scale(${newScale}) rotate(${currentRotation})`;
		}, 300);

		// Clear interval when animation ends
		setTimeout(() => {
			clearInterval(pulseInterval);
		}, duration - 500);
	}

	// Remove bubble after animation completes
	setTimeout(() => {
		bubble.style.opacity = "0";
		bubble.style.transition = "opacity 0.5s ease-out";
		setTimeout(() => {
			if (bubble.parentNode === container) {
				container.removeChild(bubble);
			}

			// Remove container when last bubble is removed
			if (container.childNodes.length <= 1) {
				// Account for backgroundEffect
				if (container.parentNode) {
					container.parentNode.removeChild(container);
				}
			}
		}, 500);
	}, duration - 500);
}

/**
 * A simpler function to create a success animation with common defaults.
 * This is a convenience wrapper around createTextBubbleAnimation for quick use.
 *
 * @param message Optional main success message (defaults to "Success!")
 * @param duration Optional animation duration in ms (defaults to 3000ms)
 * @param container Optional container element (defaults to document.body)
 * @returns Animation duration in ms
 */
export function createSuccessAnimation(
	message?: string,
	duration = 3000,
	container = document.body,
): number {
	return createTextBubbleAnimation({
		duration,
		container,
		messages: message ? [message, "✅", "🎉"] : undefined,
		count: 30, // Less bubbles for a simpler effect
		colors: ["#22c55e", "#16a34a", "#15803d"], // Green success colors
	});
}
