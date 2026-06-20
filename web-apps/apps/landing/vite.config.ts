import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      "@synthapi/ui": resolve(rootDir, "../../packages/ui/src/index.ts"),
    },
  },
});
