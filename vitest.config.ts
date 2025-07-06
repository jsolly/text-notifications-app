/// <reference types="vitest" />

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if the built shared package exists
const sharedBuiltPath = resolve(__dirname, "shared/dist/index.js");
const sharedSourcePath = resolve(__dirname, "shared/src/index.ts");

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
			"@text-notifications/shared": existsSync(sharedBuiltPath)
				? sharedBuiltPath
				: sharedSourcePath,
		},
	},
});
