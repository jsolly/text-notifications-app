/// <reference types="vitest" />

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
	resolve: {
		alias: {
			"@text-notifications/shared": resolve(__dirname, "shared/dist/index.js"),
		},
	},
});
