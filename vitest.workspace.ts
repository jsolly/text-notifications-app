import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	// Main project configuration
	{
		extends: "./config/vitest.config.ts",
		test: {
			name: "root",
			include: ["test/**/*.test.ts"],
			environment: "node",
		},
	},
	// // Shared package configuration
	// {
	// 	extends: "./config/vitest.config.ts",
	// 	test: {
	// 		name: "shared",
	// 		include: ["shared/**/*.test.ts"],
	// 		environment: "node",
	// 	},
	// },
	// // Functions configuration
	// {
	// 	extends: "./config/vitest.config.ts",
	// 	test: {
	// 		name: "functions",
	// 		include: ["functions/**/*.test.ts"],
	// 		environment: "node",
	// 	},
	// },
]);
