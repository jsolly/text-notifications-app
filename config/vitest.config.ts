/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";

export default defineConfig({
	test: {
		env: loadEnv("", process.cwd(), ""),
	},
});
