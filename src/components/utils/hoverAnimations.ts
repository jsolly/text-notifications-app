/**
 * Button Hover Creatures Animation
 * Creates fun animations of creatures peeking from the sides of the screen
 * when hovering over specific elements.
 */

interface CreatureHoverOptions {
	buttonSelector: string; // The CSS selector for the button to apply hover effect to
	creatureCount?: number; // Number of creatures to show
	emojiTypes?: string[]; // Array of emoji characters to use
	animationDuration?: number; // Duration of the animation in ms
	container?: HTMLElement; // Container to append creatures to (defaults to document.body)
	containerSelector?: string; // Selector for the container from which creatures will peek (defaults to body)
	respectReducedMotion?: boolean; // Whether to respect user's reduced motion preference
}

// Default configuration
const DEFAULT_CREATURE_COUNT = 8;
const DEFAULT_EMOJI_TYPES = [
	"🎉", // Party popper
	"🥳", // Party face
	"🤩", // Star-struck
	"😍", // Heart eyes
	"👍", // Thumbs up
	"🙌", // Raised hands
	"✨", // Sparkles
	"🚀", // Rocket
	"💯", // 100 points
	"🔥", // Fire
];

/**
 * Checks if user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Creates creatures container and adds it to the DOM
 * @param container The parent container (defaults to body)
 * @returns The creatures container element
 */
function createCreaturesContainer(
	targetContainer: HTMLElement,
): HTMLDivElement {
	const creaturesContainer = document.createElement("div");
	creaturesContainer.classList.add("creatures-container");

	// Style the container to match the target container's dimensions and position
	Object.assign(creaturesContainer.style, {
		position: "absolute",
		top: "0",
		left: "0",
		width: "100%",
		height: "100%",
		pointerEvents: "none", // Allow clicking through the container
		zIndex: "10",
		overflow: "visible", // Allow creatures to appear outside the container
	});

	// Add relative positioning to the target container if it doesn't have positioning
	const targetContainerPosition =
		window.getComputedStyle(targetContainer).position;
	if (targetContainerPosition === "static") {
		targetContainer.style.position = "relative";
	}

	targetContainer.appendChild(creaturesContainer);
	return creaturesContainer;
}

/**
 * Create a single emoji element
 * @param emoji The emoji character to use
 * @param side Which side of the container ('left' or 'right')
 * @returns The emoji HTML element
 */
function createEmoji(emoji: string, side: "left" | "right"): HTMLDivElement {
	const emojiElement = document.createElement("div");

	// Add base emoji class
	emojiElement.classList.add("peek-emoji");

	// Set the emoji character
	emojiElement.textContent = emoji;

	// Set base styles for the emoji
	Object.assign(emojiElement.style, {
		position: "absolute",
		fontSize: "2.5rem", // Larger font size for emojis
		lineHeight: "1",
		transition:
			"transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-in-out",
		transform: side === "left" ? "translateX(-150%)" : "translateX(150%)",
		opacity: "0",
		filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))", // Add subtle shadow for depth
	});

	return emojiElement;
}

/**
 * Creates and initializes the CSS keyframes for emoji animations
 */
function createAnimationKeyframes(): void {
	// Only add the stylesheet once
	if (document.getElementById("emoji-animations")) return;

	const stylesheet = document.createElement("style");
	stylesheet.id = "emoji-animations";

	stylesheet.textContent = `
    .peek-emoji {
      transform-origin: center bottom;
    }
    @keyframes emojiBounce {
      0% { transform: translateY(0) translateX(-50%) rotate(var(--rotation)); }
      50% { transform: translateY(-15px) translateX(-50%) rotate(var(--rotation)); }
      100% { transform: translateY(0) translateX(-50%) rotate(var(--rotation)); }
    }
  `;

	document.head.appendChild(stylesheet);
}

/**
 * Positions emojis at the bottom of the container
 * @param emojis Array of emoji elements
 */
function positionEmojis(emojis: HTMLDivElement[]): void {
	// Distribute emojis across the entire width of the container
	const totalEmojis = emojis.length;

	for (let i = 0; i < emojis.length; i++) {
		const emoji = emojis[i];

		// Distribute evenly across the full width (5% to 95%)
		// Padding the edges slightly to avoid emojis being cut off
		const positionPercent = 5 + (i / (totalEmojis - 1)) * 90;

		// Position horizontally across the full width
		emoji.style.left = `${positionPercent}%`;
		emoji.style.right = "auto";
		emoji.style.transform = "translateX(-50%)"; // Center the emoji on its position point

		// Fixed vertical position at the bottom with some randomness
		emoji.style.bottom = `${5 + Math.random() * 15}px`; // Random height 5-20px from bottom

		// Determine which side the emoji is closest to for exit animation
		emoji.dataset.side = positionPercent < 50 ? "left" : "right";

		// Add z-index variation to prevent complete overlap
		emoji.style.zIndex = `${i + 1}`;

		// Slight size variation to make them more playful
		const sizeVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
		emoji.style.fontSize = `${2.5 * sizeVariation}rem`;

		// Add small rotation for more personality
		const rotation = -10 + Math.random() * 20; // -10 to +10 degrees
		emoji.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
		emoji.style.setProperty("--rotation", `${rotation}deg`);
	}
}

/**
 * Shows emojis by animating them in from the sides
 * @param emojis Array of emoji elements
 */
function showEmojis(emojis: HTMLDivElement[]): void {
	for (const [index, emoji] of emojis.entries()) {
		// Get the stored rotation
		const rotation = emoji.style.getPropertyValue("--rotation") || "0deg";

		// Initial position (off-screen)
		if (emoji.dataset.side === "left") {
			emoji.style.transform = `translateX(-150%) rotate(${rotation})`;
		} else {
			emoji.style.transform = `translateX(150%) rotate(${rotation})`;
		}

		// Stagger the appearance of emojis
		setTimeout(() => {
			emoji.style.opacity = "1";
			emoji.style.transform = `translateX(-50%) rotate(${rotation})`;
			// Add bouncing animation
			emoji.style.animation = "emojiBounce 1.5s ease-in-out infinite";
		}, 70 * index); // Slightly longer delay between emojis
	}
}

/**
 * Hides emojis by animating them out to the sides
 * @param emojis Array of emoji elements
 */
function hideEmojis(emojis: HTMLDivElement[]): void {
	for (const [index, emoji] of emojis.entries()) {
		// Extract rotation from transform
		const rotationMatch = emoji.style.transform.match(/rotate\(([^)]+)\)/);
		const rotation = rotationMatch ? rotationMatch[1] : "0deg";

		// Stagger the disappearance of emojis
		setTimeout(() => {
			emoji.style.opacity = "0";
			emoji.style.transform =
				emoji.dataset.side === "left"
					? `translateX(-150%) rotate(${rotation})`
					: `translateX(150%) rotate(${rotation})`;
		}, 50 * index);
	}
}

/**
 * Sets up the hover animation for emojis peeking from the container edges
 * @param options Configuration options for the hover animation
 */
export function setupCreatureHoverAnimation(
	options: CreatureHoverOptions,
): void {
	// Respect reduced motion preference if enabled
	if (options.respectReducedMotion !== false && prefersReducedMotion()) {
		return; // Don't set up animations for users who prefer reduced motion
	}

	// Get or use default values
	const creatureCount = options.creatureCount || DEFAULT_CREATURE_COUNT;
	const emojiTypes = options.emojiTypes || DEFAULT_EMOJI_TYPES;

	// Find the container element from which emojis will peek
	let targetContainer: HTMLElement;
	if (options.containerSelector) {
		targetContainer = document.querySelector(
			options.containerSelector,
		) as HTMLElement;
		if (!targetContainer) {
			console.warn(
				`Container selector "${options.containerSelector}" not found. Using body instead.`,
			);
			targetContainer = document.body;
		}
	} else {
		// Find the closest container to the button
		const button = document.querySelector(
			options.buttonSelector,
		) as HTMLElement;
		if (button) {
			// Try to find a suitable container (look for a card or form container)
			targetContainer = button.closest(
				".card, .form-container, form, .max-w-md, .p-6, .p-8",
			) as HTMLElement;
			// If no suitable container found, use the body
			if (!targetContainer) {
				targetContainer = document.body;
			}
		} else {
			targetContainer = document.body;
		}
	}

	// Create the keyframes for our animations
	createAnimationKeyframes();

	// Find the button to apply hover effect to
	const buttons = document.querySelectorAll(options.buttonSelector);
	if (buttons.length === 0) return;

	// Create container for emojis
	const emojiContainer = createCreaturesContainer(targetContainer);

	// Create emojis
	const emojis: HTMLDivElement[] = [];
	for (let i = 0; i < creatureCount; i++) {
		const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
		const typeIndex = i % emojiTypes.length;
		const emoji = createEmoji(emojiTypes[typeIndex], side);
		emojis.push(emoji);
		emojiContainer.appendChild(emoji);
	}

	// Position emojis along the sides
	positionEmojis(emojis);

	// Set up event listeners for all buttons matching the selector
	for (const button of Array.from(buttons)) {
		button.addEventListener("mouseenter", () => showEmojis(emojis));
		button.addEventListener("mouseleave", () => hideEmojis(emojis));
		button.addEventListener("focus", () => showEmojis(emojis));
		button.addEventListener("blur", () => hideEmojis(emojis));
	}
}

/**
 * Preset configuration for the signup form's enthusiastic emoji animation
 * @param buttonSelector Optional custom button selector (defaults to '#submit-button')
 * @param containerSelector Optional custom container selector (defaults to '#signup-form')
 * @returns Configured options for the creature hover animation
 */
export function setupSignupFormAnimation(
	buttonSelector = "#submit-button",
	containerSelector = "#signup-form",
): void {
	// Enthusiastic emojis for the signup form
	const SIGNUP_EMOJI_TYPES = [
		"🎉", // Party popper
		"🥳", // Party face
		"🤩", // Star-struck
		"✨", // Sparkles
		"👍", // Thumbs up
		"🔥", // Fire
		"💯", // Hundred points
		"🙌", // Raised hands
		"🚀", // Rocket
		"😍", // Heart eyes
		"🎊", // Confetti ball
		"💫", // Dizzy
		"⭐", // Star
		"🏆", // Trophy
	];

	// Apply the animation with preset configuration
	setupCreatureHoverAnimation({
		buttonSelector,
		creatureCount: 10, // Higher count to fill the width
		containerSelector,
		emojiTypes: SIGNUP_EMOJI_TYPES,
		respectReducedMotion: true,
	});
}
