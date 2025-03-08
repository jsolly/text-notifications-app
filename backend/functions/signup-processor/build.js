/**
 * Build script for the signup-processor package
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
 * Build the signup-processor package
 */
async function build() {
	// Common build options
	const buildOptions = {
		entryPoints: ["index.ts"],
		bundle: true,
		platform: "node",
		target: "es2020",
		outfile: "dist/index.js",
	};

	// Mode-specific options
	if (mode === "lambda") {
		// Lambda build options
		Object.assign(buildOptions, {
			minify: true,
			format: "cjs",
			resolveExtensions: [".js", ".ts"],
			alias: {
				"@text-notifications/shared": "./shared/dist/index.js",
			},
			external: ["pg"],
		});
	} else {
		// Dev build options
		Object.assign(buildOptions, {
			format: "esm",
			external: ["@text-notifications/shared"],
			sourcemap: true,
		});
	}

	try {
		await esbuild.build(buildOptions);
		console.log(`✅ Signup processor built successfully (${mode} mode)`);
	} catch (error) {
		console.error(`❌ Build failed (${mode} mode):`, error);
		process.exit(1);
	}
}

build();
