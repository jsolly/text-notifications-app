/// <reference types="vitest" />

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: resolve(__dirname, ".env") });

export default defineConfig({
	test: {
		include: [resolve(__dirname, "tests/functions/**/*.test.ts")],
		silent: false,
		// Run integration tests sequentially to avoid database conflicts
		sequence: {
			hooks: "list",
		},
		// Use single thread for integration tests to avoid deadlocks
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true,
			},
		},
	},
});
