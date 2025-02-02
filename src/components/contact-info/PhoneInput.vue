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
                    <ValidationIcon v-if="phoneNumber" :isValid="isValid" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import {
	AsYouType,
	parsePhoneNumberFromString,
	getExampleNumber,
	isValidPhoneNumber,
} from "libphonenumber-js";
import ValidationIcon from "./ValidationIcon.vue";

const phoneNumber = ref("");
const country = ref("US");
const formatter = ref(new AsYouType(country.value));

// Reset formatter when country changes
watch(country, (newCountry, oldCountry) => {
	formatter.value = new AsYouType(newCountry);
	if (!phoneNumber.value) return;

	try {
		const parsed = parsePhoneNumberFromString(phoneNumber.value, oldCountry);
		if (parsed?.number) {
			const newParsed = parsePhoneNumberFromString(parsed.number);
			phoneNumber.value = formatter.value.input(
				newParsed?.nationalNumber ?? "",
			);
		}
	} catch {
		phoneNumber.value = "";
	}
});

const placeholder = computed(() => {
	try {
		return (
			getExampleNumber(country.value)?.formatNational() ?? "(555) 123-4567"
		);
	} catch {
		return "(555) 123-4567";
	}
});

function handleInput(e) {
	const input = e.target;
	const onlyDigits = input.value.replace(/\D/g, "");

	// Handle backspace for short inputs
	if (
		e.inputType === "deleteContentBackward" &&
		phoneNumber.value.length <= 4
	) {
		phoneNumber.value = "";
		return;
	}

	// Check max length
	const maxLength =
		getExampleNumber(country.value)?.nationalNumber.length ?? 15;
	if (onlyDigits.length > maxLength) return;

	// Reset formatter and format the number
	formatter.value.reset();
	phoneNumber.value = formatter.value.input(onlyDigits);
}

const isValid = computed(
	() =>
		phoneNumber.value && isValidPhoneNumber(phoneNumber.value, country.value),
);

const borderClass = computed(() => {
	if (!phoneNumber.value) return "";
	return isValid.value
		? "border-green-500 focus-within:ring-green-500 focus-within:border-green-500"
		: "border-red-300 focus-within:ring-red-500 focus-within:border-red-500";
});
</script>