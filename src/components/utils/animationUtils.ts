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
}

export function createTextBubbleAnimation(options: TextBubbleOptions = {}) {
	const {
		count = 60,
		colors = ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE"],
		duration = 6000,
		container = document.body,
		messages = [
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
		],
	} = options;

	// Create a container for the animation
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

	// Add a subtle background effect
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

	// Create the text bubbles
	for (let i = 0; i < count; i++) {
		setTimeout(() => {
			const bubble = document.createElement("div");

			// Randomly choose if this is a sent or received message bubble
			const isSent = Math.random() > 0.5;

			// Set bubble styles
			bubble.style.position = "absolute";
			bubble.style.borderRadius = isSent
				? "20px 20px 0 20px"
				: "20px 20px 20px 0";
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
			animationContainer.appendChild(bubble);

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
					if (bubble.parentNode === animationContainer) {
						animationContainer.removeChild(bubble);
					}

					// Remove container when last bubble is removed
					if (animationContainer.childNodes.length === 0) {
						container.removeChild(animationContainer);
					}
				}, 500);
			}, duration - 500);
		}, Math.random() * 600); // Stagger the bubble creation
	}
}
