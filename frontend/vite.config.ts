import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	resolve: {
		alias: {
			"@text-notifications/shared": resolve(
				__dirname,
				"../shared/src/index.ts",
			),
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
