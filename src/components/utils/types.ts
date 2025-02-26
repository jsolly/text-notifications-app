/**
 * Type definitions for HTMX and other component utilities
 */

/**
 * HTMX Event interface for better type checking
 * Represents the event object passed to HTMX event handlers
 */
export interface HtmxEvent extends Event {
	detail: {
		xhr?: XMLHttpRequest;
		elt?: HTMLElement;
		target?: HTMLElement;
		[key: string]: unknown;
	};
}
