import path from "node:path";
import { fileURLToPath } from "node:url";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Load environment variables from the root directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
	site:
		process.env.NODE_ENV === "development"
			? "http://localhost:4321"
			: "https://www.textnotifications.app",
	integrations: [sitemap({}), vue()],
	vite: {
		plugins: [tailwindcss()],
		// Build optimizations for CI
		build: {
			// Reduce build time by skipping source maps in CI
			sourcemap: process.env.CI !== "true",
			// Optimize chunk size
			rollupOptions: {
				output: {
					manualChunks: {
						vendor: ["vue", "@heroicons/vue"],
					},
				},
			},
		},
		// Optimize for CI builds
		optimizeDeps: {
			include: ["vue", "@heroicons/vue", "@vueuse/core"],
		},
	},
});
