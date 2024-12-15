export function initializeNotificationTimings() {
	const checkboxes = document.querySelectorAll('input[type="checkbox"]');
	for (const checkbox of checkboxes) {
		checkbox.addEventListener("change", (e) => {
			const target = e.target;
			const timingElement = target
				.closest(".p-3")
				?.querySelector("[data-notification-timing]");
			if (timingElement) {
				timingElement.classList.toggle("hidden", !target.checked);
			}
		});
	}
}
