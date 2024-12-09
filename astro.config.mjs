// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
	site: "https://www.johnsolly.dev",
	integrations: [
		tailwind(),
		sitemap({
			customPages: ["https://www.johnsolly.dev/John-Solly-Resume.pdf"],
		}),
	],
});
