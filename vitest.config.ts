/// <reference types="vitest" />

import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vite";

// Load environment variables from .env file
config({ path: resolve(__dirname, "../.env") });

export default defineConfig({
	test: {
		include: [resolve(__dirname, "tests/functions/**/*.test.ts")],
		silent: false,
		// Run integration tests sequentially to avoid database conflicts
		sequence: {
			hooks: "list",
		},
		// Use single thread for integration tests to avoid deadlocks
		poolOptions: {
			threads: {
				// Run integration tests in a single thread
				singleThread: true,
			},
		},
	},
});
