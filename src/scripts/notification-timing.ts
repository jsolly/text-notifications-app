export function initializeNotificationTimings() {
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const timingElement = target.closest('.p-3')?.querySelector('[data-notification-timing]');
      if (timingElement) {
        timingElement.classList.toggle('hidden', !target.checked);
      }
    });
  });
} 