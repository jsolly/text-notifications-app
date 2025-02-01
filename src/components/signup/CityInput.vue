<template>
    <div class="relative" ref="containerRef">
        <label for="city-search" class="block text-sm font-medium text-slate-700 mb-1">
            City
        </label>
        <input ref="inputRef" type="text" id="city-search" v-model="searchQuery" @input="handleInput"
            @keydown="handleKeydown" placeholder="Search for a city..." autocomplete="off" role="combobox"
            :aria-expanded="showDropdown.toString()" aria-controls="city-dropdown" aria-autocomplete="list"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @focus="showDropdown = true" />
        <!-- Hidden input so that the selected city value is submitted with the form -->
        <input type="hidden" name="city" :value="modelValue" required />

        <div id="city-dropdown" v-show="showDropdown && searchQuery.length >= 2" ref="dropdownEl" role="listbox"
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
import { ref, computed, onMounted, watch, nextTick } from "vue";
// Import Fuse for fuzzy search functionality.
import Fuse from "fuse.js";
// Import VueUse composable for click outside detection
import { onClickOutside } from "@vueuse/core";

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

// Local reactive state.
const searchQuery = ref("");
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
	emit("update:modelValue", result.item.value);
	searchQuery.value = result.item.label;
	showDropdown.value = false;
	highlightedIndex.value = -1;
};

// Called on each input event; resets the selected value if the query does not match.
const handleInput = () => {
	const current = props.cityOptions.find((c) => c.value === props.modelValue);
	if (!current || searchQuery.value !== current.label) {
		emit("update:modelValue", null);
		showDropdown.value = true;
		highlightedIndex.value = -1;
	}
};

// Handle keyboard navigation
const handleKeydown = (e) => {
	if (searchQuery.value.length < 2 || filteredCities.value.length === 0) return;

	const actions = {
		ArrowDown: () => {
			if (!showDropdown.value) {
				showDropdown.value = true;
				nextTick(() => {
					highlightedIndex.value = 0;
				});
				return;
			}
			highlightedIndex.value =
				highlightedIndex.value < 0
					? 0
					: Math.min(
							highlightedIndex.value + 1,
							filteredCities.value.length - 1,
						);
		},
		ArrowUp: () => {
			if (!showDropdown.value) {
				showDropdown.value = true;
				nextTick(() => {
					highlightedIndex.value = filteredCities.value.length - 1;
				});
				return;
			}
			highlightedIndex.value =
				highlightedIndex.value < 0
					? filteredCities.value.length - 1
					: Math.max(highlightedIndex.value - 1, 0);
		},
		Enter: () => {
			if (highlightedIndex.value >= 0) {
				selectCity(filteredCities.value[highlightedIndex.value]);
			}
		},
		Escape: () => {
			showDropdown.value = false;
			highlightedIndex.value = -1;
		},
	};

	if (actions[e.key]) {
		e.preventDefault();
		actions[e.key]();
	}
};

// Watch for changes to highlighted index and scroll into view
watch(highlightedIndex, () => {
	const highlighted = dropdownEl.value?.querySelector(
		'[data-highlighted="true"]',
	);
	highlighted?.scrollIntoView({ block: "nearest" });
});
</script>