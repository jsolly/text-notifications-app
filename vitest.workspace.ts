import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	// Backend tests configuration
	{
		extends: "./backend/config/vitest.config.ts",
		test: {
			name: "backend",
			include: ["backend/test/**/*.test.ts"],
			environment: "node",
		},
	},
	// Shared package configuration
	{
		extends: "./backend/config/vitest.config.ts",
		test: {
			name: "shared",
			include: ["shared/**/*.test.ts"],
			environment: "node",
		},
	},
	// Functions configuration
	{
		extends: "./backend/config/vitest.config.ts",
		test: {
			name: "functions",
			include: ["backend/functions/**/*.test.ts"],
			environment: "node",
		},
	},
]);
