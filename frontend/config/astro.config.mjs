// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import alpine from "@astrojs/alpinejs";
import vue from "@astrojs/vue";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load environment variables from the root directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// https://astro.build/config
export default defineConfig({
	site:
		process.env.NODE_ENV === "development"
			? "http://localhost:4321"
			: "https://www.textnotifications.app",
	integrations: [
		tailwind({
			configFile: "./config/tailwind.config.mjs",
		}),
		sitemap({}),
		alpine(),
		vue(),
	],
});
