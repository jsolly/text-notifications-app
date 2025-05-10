/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import path from "node:path";

const testsDir = __dirname;

export default defineConfig({
	test: {
		include: [
			path.resolve(testsDir, "functions/integration/**/*.test.ts"),
			path.resolve(testsDir, "functions/unit/**/*.test.ts"),
		],
		exclude: [path.resolve(testsDir, "functions/integration/utils/**")],
		environment: "node",
		env: loadEnv("", path.resolve(testsDir, ".."), ""),
		root: path.resolve(testsDir, ".."),
		silent: true,
	},
});
