/**
 * Build script for the shared package
 *
 * This script uses esbuild to bundle the TypeScript code into a single JavaScript file.
 * It supports a --watch flag for development.
 */

import * as esbuild from "esbuild";

// Parse command line arguments
const watch = process.argv.includes("--watch");

/**
 * Build the shared package
 */
async function build() {
	const buildOptions = {
		entryPoints: ["src/index.ts"],
		bundle: true,
		platform: "node",
		target: "es2020",
		outfile: "dist/index.js",
		format: "esm",
		sourcemap: true,
	};

	try {
		if (watch) {
			const ctx = await esbuild.context(buildOptions);
			await ctx.watch();
			console.log("Watching for changes...");
		} else {
			await esbuild.build(buildOptions);
			console.log("✅ Shared package built successfully");
		}
	} catch (error) {
		console.error("❌ Build failed:", error);
		process.exit(1);
	}
}

build();
