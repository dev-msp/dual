import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import path from "path";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: [],
  },
  resolve: {
    alias: {
      "~": "/src",
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
