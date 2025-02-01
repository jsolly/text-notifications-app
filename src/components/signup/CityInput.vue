<template>
    <div class="relative" ref="containerRef">
        <label for="city-search" class="block text-sm font-medium text-slate-700 mb-1">
            City
        </label>
        <input ref="inputRef" type="text" id="city-search" v-model="rawSearchQuery" @input="handleInput"
            @keydown="handleKeydown" placeholder="Search for a city..." autocomplete="off" role="combobox"
            :aria-expanded="showDropdown.toString()" aria-controls="city-dropdown" aria-autocomplete="list"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @focus="showDropdown = true" />
        <!-- Hidden input so that the selected city value is submitted with the form -->
        <input type="hidden" name="city" :value="modelValue" required />

        <div id="city-dropdown" v-show="showDropdown && rawSearchQuery.length >= 2" ref="dropdownEl" role="listbox"
            class="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-lg border border-slate-200 max-h-60 overflow-auto">
            <div v-if="filteredCities.length === 0" class="px-4 py-2 text-sm text-slate-500">
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
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
// Import Fuse for fuzzy search functionality.
import Fuse from "fuse.js";
// Import refDebounced along with onClickOutside
import { onClickOutside, refDebounced } from "@vueuse/core";

// Define component props and emits.
// Using the recommended v-model naming: we expect a prop called "modelValue"
// and emit "update:modelValue" when the selected value changes.
const props = defineProps({
	cityOptions: {
		type: Array,
		required: true,
	},
	modelValue: {
		type: [String, Number, null],
		default: null,
	},
});
const emit = defineEmits(["update:modelValue"]);

// Create a regular ref for the raw input
const rawSearchQuery = ref("");
// Create a debounced version for search
const searchQuery = refDebounced(rawSearchQuery, 300);

const showDropdown = ref(false);
const highlightedIndex = ref(-1);

// Initialize Fuse instance
const fuse = new Fuse(props.cityOptions, { keys: ["label"] });

// Computed property using debounced search query
const filteredCities = computed(() => {
	if (searchQuery.value.length < 2) return [];
	return fuse.search(searchQuery.value).slice(0, 10);
});

// DOM element refs.
const containerRef = ref(null);
const dropdownEl = ref(null);
const inputRef = ref(null);

// Reset dropdown state
const resetDropdown = () => {
	showDropdown.value = false;
	highlightedIndex.value = -1;
};

// Setup click outside handler after component is mounted
onMounted(() => {
	onClickOutside(containerRef, resetDropdown);
});

// Method to select a city from the dropdown.
const selectCity = (result) => {
	emit("update:modelValue", result.item.value);
	rawSearchQuery.value = result.item.label;
	resetDropdown();
};

// Modify handleInput to use debounced search
const handleInput = () => {
	const current = props.cityOptions.find((c) => c.value === props.modelValue);
	if (!current || rawSearchQuery.value !== current.label) {
		emit("update:modelValue", null);
		showDropdown.value = true;
		highlightedIndex.value = -1;
	}
};

// Handle keyboard navigation
const handleKeydown = (e) => {
	if (rawSearchQuery.value.length < 2 || filteredCities.value.length === 0)
		return;

	const maxIndex = filteredCities.value.length - 1;
	const actions = {
		ArrowDown: () => {
			if (!showDropdown.value) {
				showDropdown.value = true;
				highlightedIndex.value = 0;
				return;
			}
			highlightedIndex.value = Math.min(
				(highlightedIndex.value < 0 ? -1 : highlightedIndex.value) + 1,
				maxIndex,
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
				0,
			);
		},
		Enter: () => {
			if (highlightedIndex.value >= 0) {
				selectCity(filteredCities.value[highlightedIndex.value]);
			}
		},
		Escape: resetDropdown,
	};

	if (actions[e.key]) {
		e.preventDefault();
		actions[e.key]();
	}
};
</script>