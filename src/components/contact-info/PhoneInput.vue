<template>
	<div>
		<label for="phone-number" class="block text-sm font-medium text-slate-700 mb-1">
			{{ CONTACT_SCHEMA.phoneNumber.formLabel }}
		</label>
		<div class="flex">
			<div class="group relative flex w-full rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
				:class="borderClass">
				<div class="relative w-24">
					<select id="country" name="country" v-model="country" autocomplete="country" aria-label="Country"
						class="w-full appearance-none rounded-l-lg py-2 pl-3 pr-8 text-base text-gray-500 focus:outline-none border-r border-slate-300">
						<option v-for="(option, code) in CONTACT_SCHEMA.phoneNumber.countries" :key="code"
							:value="code">
							{{ option.code }}
						</option>
					</select>
					<svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
						viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd"
							d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd" />
					</svg>
				</div>
				<div class="flex-1 relative">
					<input type="tel" id="phone-number" name="phone-number" v-model="phoneNumber" @input="handleInput"
						class="w-full rounded-r-lg py-2 px-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
						:placeholder="placeholder" :required="CONTACT_SCHEMA.phoneNumber.required" />
					<ValidationIcon v-if="phoneNumber" :isValid="isValid" />
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
	AsYouType,
	getExampleNumber,
	isValidPhoneNumber,
} from "libphonenumber-js";
import ValidationIcon from "./ValidationIcon.vue";
import { CONTACT_SCHEMA } from "../../../types/form.schema";
import type { Country } from "../../../types/form.schema";
import type { Examples } from "libphonenumber-js";
import metadata from "libphonenumber-js/metadata.min.json";

const props = defineProps<{
	modelValue?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

// Destructure for easy access to the phone schema settings
const phoneSchema = CONTACT_SCHEMA.phoneNumber;
const { defaultCountry, validation } = phoneSchema;

const phoneNumber = ref(props.modelValue || "");
const country = ref<Country>(defaultCountry);

// Helper function to format phone numbers based on a string of digits.
function formatPhone(digits: string): string {
	return new AsYouType(country.value).input(digits);
}

// Ref to hold the raw digits (i.e. only numbers) from the phone number.
const lastDigits = ref(phoneNumber.value.replace(/\D/g, ""));

// Watch the phone number, ensuring to emit any changes.
watch(phoneNumber, (newValue) => {
	emit("update:modelValue", newValue);
});

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

// Updated to use Event type for compatibility; cast as InputEvent where necessary.
function handleInput(e: Event) {
	const input = e.target as HTMLInputElement;
	const inputEvent = e as InputEvent;
	// Store the previous raw digits & formatted value.
	const oldDigits = lastDigits.value;
	const oldFormatted = formatPhone(oldDigits);
	// If the previous phone number was valid and this is an insertion, revert to that valid number.
	if (
		inputEvent.inputType !== "deleteContentBackward" &&
		isValidPhoneNumber(oldFormatted, country.value)
	) {
		input.value = oldFormatted;
		phoneNumber.value = oldFormatted;
		return;
	}
	let newDigits = input.value.replace(/\D/g, "");
	if (
		inputEvent.inputType === "deleteContentBackward" &&
		newDigits.length === oldDigits.length
	) {
		newDigits = oldDigits.slice(0, -1);
	}
	phoneNumber.value = formatPhone(newDigits);
	lastDigits.value = newDigits;
}

const isValid = computed(() => {
	return phoneNumber.value
		? isValidPhoneNumber(phoneNumber.value, country.value)
		: undefined;
});

const borderClass = computed(() => {
	if (!phoneNumber.value) return validation.validationClasses.default;
	return isValid.value
		? validation.validationClasses.valid
		: validation.validationClasses.invalid;
});
</script>