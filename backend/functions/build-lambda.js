/**
 * Build script for Lambda functions
 *
 * This script uses esbuild to bundle the TypeScript code into a single JavaScript file.
 * It supports two modes:
 * - default: for development (--mode=dev or no flag)
 * - lambda: for AWS Lambda deployment (--mode=lambda)
 */

import * as esbuild from "esbuild";

// Parse command line arguments
const mode = process.argv.includes("--mode=lambda") ? "lambda" : "dev";
const functionName = process.env.FUNCTION_NAME || "unknown-function";

/**
 * Build the Lambda function package
 */
async function build() {
	console.log(`🚀 Building ${functionName} in ${mode} mode...`);

	// Common build options
	const buildOptions = {
		entryPoints: ["index.ts"],
		bundle: true,
		platform: "node",
		target: "es2020",
		outfile: "dist/index.js",
		logLevel: "info",
	};

	// Mode-specific options
	if (mode === "lambda") {
		console.log("📦 Configuring for Lambda deployment");
		// Lambda build options
		Object.assign(buildOptions, {
			minify: true,
			format: "esm",
			resolveExtensions: [".js", ".ts"],
			alias: {
				"@text-notifications/shared": "./shared/dist/index.js",
			},
			external: ["pg"], // 'pg' is a native module, should be excluded
		});
	} else {
		console.log("🛠️ Configuring for development");
		// Dev build options
		Object.assign(buildOptions, {
			format: "esm",
			// In dev, we expect shared to be linked or available in node_modules
			external: ["@text-notifications/shared"],
			sourcemap: true,
		});
	}

	try {
		const startTime = Date.now();
		await esbuild.build(buildOptions);
		const endTime = Date.now();
		const buildTime = ((endTime - startTime) / 1000).toFixed(2);

		console.log(
			`✅ ${functionName} built successfully in ${buildTime}s (${mode} mode)`,
		);
	} catch (error) {
		console.error(`❌ Build failed for ${functionName} (${mode} mode):`, error);
		process.exit(1);
	}
}

// Handle process termination
process.on("SIGINT", () => {
	console.log("🛑 Build interrupted");
	process.exit(0);
});

// Run the build
build().catch((error) => {
	console.error("❌ Unhandled error:", error);
	process.exit(1);
});
