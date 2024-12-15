export function initializeCheckboxGroup(parentId, childIds) {
	const parentCheckbox = document.querySelector(`#${parentId}`);
	const childCheckboxes = document.querySelectorAll(
		childIds.map((id) => `#${id}`).join(", "),
	);

	if (parentCheckbox && childCheckboxes.length) {
		// Handle parent checkbox changes
		parentCheckbox.addEventListener("change", () => {
			for (const checkbox of childCheckboxes) {
				checkbox.checked = parentCheckbox.checked;
			}
		});

		// Handle child checkbox changes
		for (const checkbox of childCheckboxes) {
			checkbox.addEventListener("change", () => {
				const allChecked = Array.from(childCheckboxes).every(
					(cb) => cb.checked,
				);
				const someChecked = Array.from(childCheckboxes).some(
					(cb) => cb.checked,
				);

				parentCheckbox.checked = allChecked;
				parentCheckbox.indeterminate = someChecked && !allChecked;
			});
		}
	}
}
