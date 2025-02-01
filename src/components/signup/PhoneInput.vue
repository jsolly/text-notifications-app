<template>
    <div>
        <label for="phone-number" class="block text-sm font-medium text-slate-700 mb-1">
            Phone number
        </label>
        <div class="flex">
            <div class="group relative flex w-full rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                :class="borderClass">
                <div class="relative w-24">
                    <select id="country" name="country" v-model="country" autocomplete="country" aria-label="Country"
                        class="w-full appearance-none rounded-l-lg py-2 pl-3 pr-8 text-base text-gray-500 focus:outline-none border-r border-slate-300">
                        <option value="US">US</option>
                        <option value="CA">CA</option>
                        <option value="GB">UK</option>
                        <option value="AU">AU</option>
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
                        :placeholder="placeholder" />
                    <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none" v-if="phoneNumber">
                        <svg v-if="isValid" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clip-rule="evenodd" />
                        </svg>
                        <svg v-else class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                                clip-rule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import {
	AsYouType,
	parsePhoneNumberFromString,
	getExampleNumber,
	isValidPhoneNumber,
} from "libphonenumber-js";

// Reactive state for the phone number input.
const phoneNumber = ref("");
const country = ref("US");
const formatter = ref(null);

// Compute a placeholder based on the example number.
const placeholder = computed(() => {
	try {
		const example = getExampleNumber(country.value);
		return example ? example.formatNational() : "(555) 123-4567";
	} catch (e) {
		return "(555) 123-4567";
	}
});

// Initialize the formatter using libphonenumber-js
function initFormatter() {
	formatter.value = new AsYouType(country.value);
}

onMounted(() => {
	initFormatter();
});

// When the country changes, reset the formatter and update the phone number.
watch(country, (newCountry, oldCountry) => {
	let internationalNumber = "";
	if (phoneNumber.value && isValid.value) {
		try {
			const parsed = parsePhoneNumberFromString(phoneNumber.value, oldCountry);
			internationalNumber = parsed?.number;
		} catch (e) {
			// Parsing error (ignore)
		}
	}
	initFormatter();
	if (internationalNumber) {
		try {
			const newParsed = parsePhoneNumberFromString(internationalNumber);
			phoneNumber.value = formatter.value?.input(newParsed?.nationalNumber);
		} catch (e) {
			phoneNumber.value = "";
		}
	} else {
		phoneNumber.value = "";
	}
});

// Handles input events from the phone number field.
function handleInput(e) {
	const input = e.target;
	const oldValue = phoneNumber.value;
	const selectionStart = input.selectionStart;
	const oldDigitsBeforeCursor = oldValue
		.slice(0, selectionStart)
		.replace(/\D/g, "").length;

	if (e.inputType === "deleteContentBackward" && oldValue.length <= 4) {
		phoneNumber.value = "";
		return;
	}
	formatter.value?.reset();
	const onlyDigits = input.value.replace(/\D/g, "");

	let example;
	try {
		example = getExampleNumber(country.value);
	} catch (error) {
		example = null;
	}
	const maxLength = example ? example.nationalNumber.length : 15;
	if (onlyDigits.length > maxLength) return;

	phoneNumber.value = formatter.value.input(onlyDigits);

	if (e.inputType !== "deleteContentBackward") {
		requestAnimationFrame(() => {
			let digitsCount = 0;
			let newPosition = 0;
			for (let i = 0; i < phoneNumber.value.length; i++) {
				if (/\d/.test(phoneNumber.value[i])) digitsCount++;
				if (digitsCount > oldDigitsBeforeCursor) break;
				newPosition = i + 1;
			}
			input.setSelectionRange(newPosition, newPosition);
		});
	}
}

// Computed property to check if the current phone number is valid.
const isValid = computed(
	() =>
		phoneNumber.value && isValidPhoneNumber(phoneNumber.value, country.value),
);

// Compute dynamic border classes indicating valid (green) or invalid (red) input.
const borderClass = computed(() => {
	if (phoneNumber.value) {
		return isValid.value
			? "border-green-500 focus-within:ring-green-500 focus-within:border-green-500"
			: "border-red-300 focus-within:ring-red-500 focus-within:border-red-500";
	}
	return "";
});
</script>

<style scoped>
/* Add any component-specific styling here */
</style>