import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@synthapi/ui": resolve(rootDir, "../../packages/ui/src/index.ts"),
    },
  },
  server: {
    allowedHosts: ["localhost"],
    proxy: {
      "/docs": {
        target: "http://localhost:5175",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
