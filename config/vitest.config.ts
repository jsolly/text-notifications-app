/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import path from "node:path";

// Get the root directory path
const rootDir = path.resolve(__dirname, "..");

export default defineConfig({
	test: {
		include: [
			path.resolve(rootDir, "test/**/*.test.ts"),
			path.resolve(rootDir, "test/**/*.spec.ts"),
		],
		environment: "node",
		env: loadEnv("", rootDir, ""),
		root: rootDir,
	},
});
