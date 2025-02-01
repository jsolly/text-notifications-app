// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import alpine from "@astrojs/alpinejs";

import vue from "@astrojs/vue";

// https://astro.build/config
export default defineConfig({
	site: "https://www.text-notifications.app",
	integrations: [tailwind(), sitemap({}), alpine(), vue()],
});
