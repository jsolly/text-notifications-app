import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"@text-me-when/shared": resolve(__dirname, "shared/src/index.ts"),
		},
	},
	optimizeDeps: {
		exclude: ["pg"],
	},
	build: {
		commonjsOptions: {
			include: [/node_modules/],
		},
		rollupOptions: {
			external: ["events", "pg"],
		},
	},
	ssr: {
		noExternal: ["@text-me-when/shared"],
	},
});
