/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import path from "node:path";

// Get the root directory path
const rootDir = path.resolve(__dirname, "..");

export default defineConfig({
	test: {
		include: [path.resolve(rootDir, "tests/**/*.ts")],
		exclude: [path.resolve(rootDir, "tests/functions/integration/utils/**")],
		environment: "node",
		env: loadEnv("", rootDir, ""),
		root: rootDir,
	},
});
