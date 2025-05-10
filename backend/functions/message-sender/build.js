/**
 * Build script for the message-sender package
 *
 * This script uses esbuild to bundle the TypeScript code into a single JavaScript file.
 * It supports two modes:
 * - default: for development (--mode=dev or no flag)
 * - lambda: for AWS Lambda deployment (--mode=lambda)
 */

import * as esbuild from "esbuild";

// Parse command line arguments
const mode = process.argv.includes("--mode=lambda") ? "lambda" : "dev";

/**
 * Build the message-sender package
 */
async function build() {
	console.log(`🚀 Building message-sender in ${mode} mode...`);

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
			external: ["pg", "twilio"],
		});
	} else {
		console.log("🛠️ Configuring for development");
		// Dev build options
		Object.assign(buildOptions, {
			format: "esm",
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
			`✅ Message sender built successfully in ${buildTime}s (${mode} mode)`,
		);
	} catch (error) {
		console.error(`❌ Build failed (${mode} mode):`, error);
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
