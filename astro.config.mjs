// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import alpine from "@astrojs/alpinejs";

import vue from "@astrojs/vue";

// https://astro.build/config
export default defineConfig({
	site:
		process.env.NODE_ENV === "development"
			? "http://localhost:4321"
			: "https://www.textnotifications.app",
	integrations: [tailwind(), sitemap({}), alpine(), vue()],
});
