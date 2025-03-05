/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";

export default defineConfig({
	test: {
		// Vitest configuration options
		env: loadEnv("", process.cwd(), ""),
	},
});
