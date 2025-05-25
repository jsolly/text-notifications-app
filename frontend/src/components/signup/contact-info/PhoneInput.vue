<template>
	<div>
		<label for="phone_number" class="block text-sm font-medium text-slate-700 mb-1">
			{{ CONTACT_SCHEMA.phone_number.form_label }}
		</label>
		<div class="flex">
			<div class="group relative flex w-full rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
				:class="{
					'border-red-500 ring-2 ring-red-500': showError,
					'validation-container': isValid && showValidationAnimation,
					'attention-container': showAttention
				}">
				<div class="relative w-24">
					<select id="country" name="country" v-model="country" autocomplete="country" aria-label="Country"
						class="w-full appearance-none rounded-l-lg py-2 pl-3 pr-8 text-base text-gray-500 focus:outline-none border-r border-slate-300 bg-white bg-no-repeat"
						:class="{ 'valid-select': isValid && showValidationAnimation }"
						style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%208l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E'); background-position: right 0.25rem center; background-size: 1.25em 1.25em;">
						<option v-for="(option, code) in CONTACT_SCHEMA.phone_number.countries" :key="code"
							:value="code">
							{{ option.code }}
						</option>
					</select>
					<input type="hidden" name="phone_country_code" :value="`+${getCountryCallingCode(country)}`" />
				</div>
				<div class="flex-1 relative">
					<input type="tel" id="phone_number_display" v-model="phoneNumber" @input="handleInput"
						class="w-full rounded-r-lg py-2 px-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
						:class="{ 'valid-input': isValid && showValidationAnimation }" :placeholder="placeholder"
						:required="CONTACT_SCHEMA.phone_number.required" />
					<input type="hidden" name="phone_number" :value="lastDigits" />
					<div v-if="phoneNumber" class="absolute inset-y-0 right-3 flex items-center pointer-events-none">
						<CheckCircleIcon v-if="isValid" class="h-5 w-5 text-green-500" aria-hidden="true" />
						<ExclamationCircleIcon v-else class="h-5 w-5 text-red-500" aria-hidden="true" />
					</div>
				</div>
			</div>
		</div>
		<p v-if="showError" class="mt-1 text-sm text-red-600">Please enter a valid phone number</p>
		<p v-if="showAttention" class="mt-1 text-sm text-blue-600">Please check your phone number</p>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
	AsYouType,
	getExampleNumber,
	isValidPhoneNumber,
} from "libphonenumber-js";
import { CONTACT_SCHEMA } from "@text-notifications/shared";
import type { Country } from "@text-notifications/shared";
import type { Examples } from "libphonenumber-js";
import metadata from "libphonenumber-js/metadata.min.json";

const phoneSchema = CONTACT_SCHEMA.phone_number;
const { default_country, validation } = phoneSchema;

const phoneNumber = ref("");
const country = ref<Country>(default_country);
const showError = ref(false);
const showValidationAnimation = ref(false);
const showAttention = ref(false);

// Helper function to format phone numbers based on a string of digits.
function formatPhone(digits: string): string {
	return new AsYouType(country.value).input(digits);
}

// Ref to hold the raw digits (i.e. only numbers) from the phone number.
const lastDigits = ref("");

// When the country changes, reformat the current phone number.
watch(country, () => {
	if (phoneNumber.value) {
		const digits = phoneNumber.value.replace(/\D/g, "");
		phoneNumber.value = formatPhone(digits);
		lastDigits.value = digits;
	}
});

const placeholder = computed(() => {
	const exampleNumber = getExampleNumber(
		country.value,
		metadata as unknown as Examples,
	);
	return exampleNumber
		? exampleNumber.formatNational()
		: validation.default_placeholder;
});

// Simplified input handler.
function handleInput(e: Event) {
	const input = e.target as HTMLInputElement;
	const ev = e as InputEvent;
	// Get the previous digits and formatted value.
	const previousDigits = lastDigits.value;
	const previousFormatted = formatPhone(previousDigits);
	// If an insertion is attempted when the previous number is already valid,
	// revert to the previous valid formatted value.
	if (
		ev.inputType !== "deleteContentBackward" &&
		isValidPhoneNumber(previousFormatted, country.value)
	) {
		input.value = previousFormatted;
		phoneNumber.value = previousFormatted;
		return;
	}
	// Extract current digits.
	let newDigits = input.value.replace(/\D/g, "");
	// For deletion events where no digit was removed, delete the last digit manually.
	if (
		ev.inputType === "deleteContentBackward" &&
		newDigits.length === previousDigits.length
	) {
		newDigits = previousDigits.slice(0, -1);
	}
	const formatted = formatPhone(newDigits);
	phoneNumber.value = formatted;
	lastDigits.value = newDigits;

	// Clear error state when user starts typing
	if (showError.value) {
		showError.value = false;
	}
}

const isValid = computed(() => {
	return phoneNumber.value
		? isValidPhoneNumber(phoneNumber.value, country.value)
		: undefined;
});

// Watch for validation changes and trigger animation
watch(isValid, (newValue) => {
	if (newValue === true) {
		showValidationAnimation.value = true;
		// Reset animation after it completes
		setTimeout(() => {
			showValidationAnimation.value = false;
		}, 2000); // Animation duration + a little buffer
	} else {
		showValidationAnimation.value = false;
	}

	// Dispatch validation event
	const event = new CustomEvent("phone_validation_change", {
		detail: { isValid: newValue },
		bubbles: true,
	});
	document.dispatchEvent(event);
});

// Listen for the highlight error event
onMounted(() => {
	document.addEventListener("highlight_phone_error", () => {
		showError.value = true;
	});

	// Listen for the highlight attention event
	document.addEventListener("highlight_phone_attention", () => {
		showAttention.value = true;
	});
});

// Clear attention state when user interacts with the field
watch(phoneNumber, () => {
	if (showAttention.value) {
		showAttention.value = false;
	}
});
</script>

<style scoped>
.validation-container {
	position: relative;
	overflow: hidden;
	border-color: transparent !important;
	transition: all 0.3s ease-in-out;
}

.validation-container::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border: none;
	/* Remove the full border */
	border-radius: 0.5rem;
	/* rounded-lg */
	box-sizing: border-box;
	z-index: 10;
	pointer-events: none;
	/* Use a gradient with transparent sections instead of clip-path */
	background:
		linear-gradient(90deg, #22c55e 0%, #22c55e 100%) top left / 0% 1px no-repeat,
		linear-gradient(90deg, #22c55e 0%, #22c55e 100%) top right / 1px 0% no-repeat,
		linear-gradient(90deg, #22c55e 0%, #22c55e 100%) bottom right / 0% 1px no-repeat,
		linear-gradient(90deg, #22c55e 0%, #22c55e 100%) bottom left / 1px 0% no-repeat;
	animation: border-flow 1.5s ease-in-out forwards;
}

/* Separate animation for the background color */
.validation-container::after {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border-radius: 0.5rem;
	background-color: rgba(240, 253, 244, 0);
	z-index: -1;
	animation: background-fade 1.5s ease-in-out forwards;
	animation-delay: 0.75s;
	/* Start halfway through the border animation */
}

.valid-input,
.valid-select {
	/* Remove the background color transition from the inputs */
	transition: all 0.3s ease-in-out;
	background-color: transparent !important;
}

/* Make sure the border between country and phone input doesn't interfere with animation */
.validation-container .relative .border-r {
	border-color: transparent;
	transition: border-color 0.3s ease-in-out;
}

@keyframes border-flow {

	/* Top border animation (left to right) */
	0%,
	20% {
		background-size: 0% 1px, 1px 0%, 0% 1px, 1px 0%;
	}

	20%,
	25% {
		background-size: 100% 1px, 1px 0%, 0% 1px, 1px 0%;
	}

	/* Right border animation (top to bottom) */
	25%,
	45% {
		background-size: 100% 1px, 1px 0%, 0% 1px, 1px 0%;
	}

	45%,
	50% {
		background-size: 100% 1px, 1px 100%, 0% 1px, 1px 0%;
	}

	/* Bottom border animation (right to left) */
	50%,
	70% {
		background-size: 100% 1px, 1px 100%, 0% 1px, 1px 0%;
	}

	70%,
	75% {
		background-size: 100% 1px, 1px 100%, 100% 1px, 1px 0%;
	}

	/* Left border animation (bottom to top) */
	75%,
	95% {
		background-size: 100% 1px, 1px 100%, 100% 1px, 1px 0%;
	}

	95%,
	100% {
		background-size: 100% 1px, 1px 100%, 100% 1px, 1px 100%;
	}
}

@keyframes background-fade {
	0% {
		background-color: rgba(240, 253, 244, 0);
	}

	100% {
		background-color: rgba(240, 253, 244, 0.3);
	}
}

/* Attention state styling */
.attention-container {
	position: relative;
	overflow: hidden;
	border-color: #3b82f6 !important;
	/* blue-500 */
	box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
	transition: all 0.3s ease-in-out;
	animation: pulse-attention 2s ease-in-out 3;
}

@keyframes pulse-attention {
	0% {
		box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
	}

	70% {
		box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
	}

	100% {
		box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
	}
}
</style>