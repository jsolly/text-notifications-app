/// <reference types="vitest" />
import { defineConfig } from "vite";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load environment variables from .env file
config({ path: resolve(__dirname, "../.env") });

export default defineConfig({
	test: {
		include: [resolve(__dirname, "../tests/functions/**/*.test.ts")],
		silent: true,
	},
});
