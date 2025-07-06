import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	resolve: {
		alias: {
			"@text-notifications/shared": resolve(__dirname, "../shared/dist/index.js"),
		},
	},
	ssr: {
		noExternal: ["@text-notifications/shared"],
	},
});
