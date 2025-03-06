import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"@text-notifications/shared": resolve(__dirname, "shared/src/index.ts"),
		},
	},
	optimizeDeps: {
		include: ["@neondatabase/serverless"],
		exclude: [],
	},
	build: {
		commonjsOptions: {
			include: [/node_modules/],
			transformMixedEsModules: true,
		},
		rollupOptions: {
			external: ["events"],
		},
	},
	ssr: {
		noExternal: ["@text-notifications/shared", "@neondatabase/serverless"],
	},
});
