<template>
    <div class="relative" ref="containerRef">
        <label for="city-search" class="block text-sm font-medium text-slate-700 mb-1">
            City
        </label>
        <input ref="inputRef" type="text" id="city-search" v-model="searchQuery" @input="handleInput"
            @keydown="handleKeydown" placeholder="Search for a city..." role="combobox"
            :aria-expanded="showDropdown.toString()" aria-controls="city-dropdown" aria-autocomplete="list"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @focus="showDropdown = true" />
        <!-- Hidden input so that the selected city value is submitted with the form -->
        <input type="hidden" name="city" :value="selectedCity" required />

        <div id="city-dropdown" v-show="showDropdown && searchQuery.length >= 2" ref="dropdownEl" role="listbox"
            class="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-lg border border-slate-200 max-h-60 overflow-auto">
            <div v-if="filteredCities.length === 0" class="px-4 py-2 text-sm text-slate-500">
                No cities found
            </div>
            <div v-for="(result, index) in filteredCities" :key="result.item.value" role="option"
                :aria-selected="highlightedIndex === index" :data-highlighted="highlightedIndex === index"
                @click="selectCity(result)"
                class="w-full px-4 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none cursor-pointer"
                :class="{ 'bg-slate-50': highlightedIndex === index }">
                {{ result.item.label }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from "vue";
// Import Fuse for fuzzy search functionality.
import Fuse from "fuse.js";
// Import VueUse composable for click outside detection
import { onClickOutside } from "@vueuse/core";

// Define component props and emits.
const props = defineProps({
	cityOptions: {
		type: Array,
		required: true,
	},
});
const emit = defineEmits(["update:selectedCity"]);

// Local reactive state.
const searchQuery = ref("");
const selectedCity = ref(null);
const showDropdown = ref(false);
const highlightedIndex = ref(-1);

// Initialize Fuse instance for filtering based on city label.
const fuse = new Fuse(props.cityOptions, {
	keys: ["label"],
	threshold: 0.3,
	distance: 100,
});

// Computed property to filter cities based on the search query.
const filteredCities = computed(() => {
	if (searchQuery.value.length < 2) return [];
	return fuse.search(searchQuery.value).slice(0, 10);
});

// DOM element refs.
const containerRef = ref(null);
const dropdownEl = ref(null);
const inputRef = ref(null);

// Setup click outside handler after component is mounted
onMounted(() => {
	onClickOutside(containerRef, (event) => {
		showDropdown.value = false;
		highlightedIndex.value = -1;
	});
});

// Method to select a city from the dropdown.
const selectCity = (result) => {
	selectedCity.value = result.item.value;
	searchQuery.value = result.item.label;
	showDropdown.value = false;
	highlightedIndex.value = -1;
	emit("update:selectedCity", selectedCity.value);
};

// Called on each input event; resets the selected city if the query does not match.
const handleInput = () => {
	const current = props.cityOptions.find((c) => c.value === selectedCity.value);
	if (!current || searchQuery.value !== current.label) {
		selectedCity.value = null;
		showDropdown.value = true;
		highlightedIndex.value = -1;
		emit("update:selectedCity", null);
	}
};

// Handle keyboard navigation and selection.
const handleKeydown = (e) => {
	if (!showDropdown.value) return;
	switch (e.key) {
		case "ArrowDown":
			e.preventDefault();
			highlightedIndex.value = Math.min(
				highlightedIndex.value + 1,
				filteredCities.value.length - 1,
			);
			scrollHighlightedIntoView();
			break;
		case "ArrowUp":
			e.preventDefault();
			highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
			scrollHighlightedIntoView();
			break;
		case "Enter":
			e.preventDefault();
			if (highlightedIndex.value >= 0) {
				selectCity(filteredCities.value[highlightedIndex.value]);
			}
			break;
		case "Escape":
			e.preventDefault();
			showDropdown.value = false;
			highlightedIndex.value = -1;
			break;
	}
};

// Scroll the highlighted option into view.
const scrollHighlightedIntoView = () => {
	nextTick(() => {
		if (dropdownEl.value) {
			const highlighted = dropdownEl.value.querySelector(
				'[data-highlighted="true"]',
			);
			if (highlighted) {
				highlighted.scrollIntoView({ block: "nearest" });
			}
		}
	});
};
</script>