/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import fs from "node:fs";

// Determine if we're in the root directory or the backend directory
const isInRoot = fs.existsSync(path.resolve(process.cwd(), ".env"));
const envPath = isInRoot ? process.cwd() : path.resolve(process.cwd(), "..");

export default defineConfig({
	test: {
		env: loadEnv("", envPath, ""),
	},
});
