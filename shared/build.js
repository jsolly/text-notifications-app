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
	console.log(`🚀 Building shared package${watch ? " in watch mode" : ""}...`);

	const buildOptions = {
		entryPoints: ["src/index.ts"],
		bundle: true,
		platform: "node",
		target: "es2020",
		outfile: "dist/index.js",
		format: "esm",
		sourcemap: true,
		logLevel: "info",
	};

	try {
		if (watch) {
			console.log("👀 Starting watch mode...");
			const ctx = await esbuild.context(buildOptions);
			await ctx.watch();
			console.log("👀 Watching for changes...");

			// Handle process termination in watch mode
			process.on("SIGINT", async () => {
				console.log("🛑 Watch mode terminated");
				await ctx.dispose();
				process.exit(0);
			});
		} else {
			const startTime = Date.now();
			await esbuild.build(buildOptions);
			const endTime = Date.now();
			const buildTime = ((endTime - startTime) / 1000).toFixed(2);

			console.log(`✅ Shared package built successfully in ${buildTime}s`);
		}
	} catch (error) {
		console.error("❌ Build failed:", error);
		process.exit(1);
	}
}

// Run the build
build().catch((error) => {
	console.error("❌ Unhandled error:", error);
	process.exit(1);
});
