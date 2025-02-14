<template>
	<div>
		<label for="phone-number" class="block text-sm font-medium text-slate-700 mb-1">
			{{ CONTACT_SCHEMA.phoneNumber.formLabel }}
		</label>
		<div class="flex">
			<div
				class="group relative flex w-full rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
				<div class="relative w-24">
					<select id="country" name="country" v-model="country" autocomplete="country" aria-label="Country"
						class="w-full appearance-none rounded-l-lg py-2 pl-3 pr-8 text-base text-gray-500 focus:outline-none border-r border-slate-300">
						<option v-for="(option, code) in CONTACT_SCHEMA.phoneNumber.countries" :key="code"
							:value="code">
							{{ option.code }}
						</option>
					</select>
					<ChevronDownIcon
						class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
				</div>
				<div class="flex-1 relative">
					<input type="tel" id="phone-number" name="phone-number" v-model="phoneNumber" @input="handleInput"
						class="w-full rounded-r-lg py-2 px-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
						:placeholder="placeholder" :required="CONTACT_SCHEMA.phoneNumber.required" />
					<div v-if="phoneNumber" class="absolute inset-y-0 right-3 flex items-center pointer-events-none">
						<CheckCircleIcon v-if="isValid" class="h-5 w-5 text-green-500" aria-hidden="true" />
						<ExclamationCircleIcon v-else class="h-5 w-5 text-red-500" aria-hidden="true" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ChevronDownIcon } from "@heroicons/vue/24/outline";
import {
	CheckCircleIcon,
	ExclamationCircleIcon,
} from "@heroicons/vue/24/solid";
import {
	AsYouType,
	getExampleNumber,
	isValidPhoneNumber,
} from "libphonenumber-js";
import { CONTACT_SCHEMA } from "../../../shared/types/form.schema";
import type { Country } from "../../../shared/types/form.schema";
import type { Examples } from "libphonenumber-js";
import metadata from "libphonenumber-js/metadata.min.json";

// Destructure for easy access to the phone schema settings
const phoneSchema = CONTACT_SCHEMA.phoneNumber;
const { defaultCountry, validation } = phoneSchema;

const phoneNumber = ref("");
const country = ref<Country>(defaultCountry);

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
		: validation.defaultPlaceholder;
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
}

const isValid = computed(() => {
	return phoneNumber.value
		? isValidPhoneNumber(phoneNumber.value, country.value)
		: undefined;
});

// Add watcher to emit validation state changes
watch(isValid, (newValue) => {
	const event = new CustomEvent("phone-validation-change", {
		detail: { isValid: newValue },
		bubbles: true,
	});
	document.dispatchEvent(event);
});
</script>