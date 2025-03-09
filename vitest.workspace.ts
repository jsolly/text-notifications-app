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
	// {
	// 	extends: "./backend/config/vitest.config.ts",
	// 	test: {
	// 		name: "shared",
	// 		include: ["shared/**/*.test.ts"],
	// 		environment: "node",
	// 	},
	// },
	// Frontend tests configuration
	// {
	// 	extends: "./backend/config/vitest.config.ts",
	// 	test: {
	// 		name: "frontend",
	// 		include: ["frontend/test/**/*.test.ts"],
	// 		environment: "node",
	// 	},
	// },
]);
