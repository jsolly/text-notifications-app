<template>
	<div class="relative" ref="containerRef">
		<label for="city_search" class="block text-sm font-medium text-slate-700 mb-1">
			City
		</label>
		<input ref="inputRef" type="text" id="city_search" v-model="rawSearchQuery" @input="handleInput"
			@keydown="handleKeydown" placeholder="Search for a city..." autocomplete="off" role="combobox"
			:aria-expanded="showDropdown" aria-controls="city_dropdown" aria-autocomplete="list"
			class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			:class="{ 'border-red-500 ring-2 ring-red-500': showError }" @focus="showDropdown = true" />
		<!-- Hidden input so that the selected city value is submitted with the form -->
		<input type="hidden" name="city_id" :value="selectedCity" required />

		<div id="city_dropdown" v-show="showDropdown && rawSearchQuery.length >= 2" ref="dropdownEl" role="listbox"
			class="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-lg border border-slate-200 max-h-60 overflow-auto">
			<div v-if="isSearching" class="px-4 py-2 text-sm text-slate-500">
				Searching...
			</div>
			<div v-else-if="filteredCities.length === 0 && searchQuery.length >= 2"
				class="px-4 py-2 text-sm text-slate-500">
				No cities found
			</div>
			<div v-for="(result, index) in filteredCities" :key="result.item.value" role="option"
				:aria-selected="highlightedIndex === index" :data-highlighted="highlightedIndex === index"
				@click="selectCity(result)"
				class="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none cursor-pointer"
				:class="{ 'bg-blue-100': highlightedIndex === index }">
				{{ result.item.label }}
			</div>
		</div>
		<p v-if="showError" class="mt-1 text-sm text-red-600">Please select a city from the list</p>
	</div>
</template>

<script setup lang="ts">
import type { CityOption } from "@text-notifications/shared";
// Import refDebounced along with onClickOutside
import { onClickOutside, refDebounced } from "@vueuse/core";
// Import Fuse for fuzzy search functionality.
import Fuse from "fuse.js";
import { computed, onMounted, ref, watch } from "vue";

// Define component props and emits.
// Using the recommended v-model naming: we expect a prop called "modelValue"
// and emit "update:modelValue" when the selected value changes.
interface Props {
	cityOptions: CityOption[];
}

interface FuseResult {
	item: CityOption;
	refIndex: number;
	score: number;
}

type KeyActions = {
	ArrowDown: () => void;
	ArrowUp: () => void;
	Enter: () => void;
	Escape: () => void;
};

const props = defineProps<Props>();

const selectedCity = ref<string | number | null>(null);
const rawSearchQuery = ref("");
// Create a debounced version for search
const searchQuery = refDebounced(rawSearchQuery, 300);
const showError = ref(false);
const isSearching = ref(false);

// Add computed property for validation state
const isValid = computed(() => selectedCity.value !== null);

// Watch validation state and emit changes
watch(isValid, (newValue) => {
	const event = new CustomEvent("city_validation_change", {
		detail: { isValid: newValue },
		bubbles: true,
	});
	document.dispatchEvent(event);
});

// Watch raw search query to detect when a user is typing
watch(rawSearchQuery, (newValue, oldValue) => {
	if (newValue !== oldValue && newValue.length >= 2) {
		isSearching.value = true;
	}
});

// Watch the debounced search query to detect when search is complete
watch(searchQuery, () => {
	isSearching.value = false;
});

const showDropdown = ref(false);
const highlightedIndex = ref(-1);

// Initialize Fuse instance
const fuse = new Fuse(props.cityOptions, { keys: ["label"] });

// Computed property using debounced search query
const filteredCities = computed(() => {
	if (searchQuery.value.length < 2) return [];
	return fuse.search(searchQuery.value).slice(0, 10) as FuseResult[];
});

// DOM element refs.
const containerRef = ref<HTMLElement | null>(null);
const dropdownEl = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

// Reset dropdown state
const resetDropdown = () => {
	showDropdown.value = false;
	highlightedIndex.value = -1;
};

// Setup click outside handler after component is mounted
onMounted(() => {
	onClickOutside(containerRef as unknown as HTMLElement, resetDropdown);

	// Listen for the highlight error event
	document.addEventListener("highlight_city_error", () => {
		showError.value = true;
	});
});

// Method to select a city from the dropdown.
const selectCity = (result: FuseResult) => {
	selectedCity.value = result.item.value;
	rawSearchQuery.value = result.item.label;
	resetDropdown();

	// Clear error state when a city is selected
	if (showError.value) {
		showError.value = false;
	}
};

const handleInput = () => {
	const current = props.cityOptions.find((c) => c.value === selectedCity.value);
	if (!current || rawSearchQuery.value !== current.label) {
		selectedCity.value = null;
		showDropdown.value = true;
		highlightedIndex.value = -1;

		// Clear error state when user starts typing
		if (showError.value) {
			showError.value = false;
		}
	}
};

const handleKeydown = (e: KeyboardEvent) => {
	if (rawSearchQuery.value.length < 2 || filteredCities.value.length === 0) return;

	const maxIndex = filteredCities.value.length - 1;
	const actions: KeyActions = {
		ArrowDown: () => {
			if (!showDropdown.value) {
				showDropdown.value = true;
				highlightedIndex.value = 0;
				return;
			}
			highlightedIndex.value = Math.min(
				(highlightedIndex.value < 0 ? -1 : highlightedIndex.value) + 1,
				maxIndex
			);
		},
		ArrowUp: () => {
			if (!showDropdown.value) {
				showDropdown.value = true;
				highlightedIndex.value = maxIndex;
				return;
			}
			highlightedIndex.value = Math.max(
				(highlightedIndex.value < 0 ? 1 : highlightedIndex.value) - 1,
				0
			);
		},
		Enter: () => {
			if (highlightedIndex.value >= 0) {
				selectCity(filteredCities.value[highlightedIndex.value]);
			}
		},
		Escape: resetDropdown,
	};

	if (actions[e.key as keyof KeyActions]) {
		e.preventDefault();
		actions[e.key as keyof KeyActions]();
	}
};
</script>