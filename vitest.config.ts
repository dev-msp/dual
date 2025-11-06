import path from "path";

import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: [],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.direnv/**",
      "**/.{idea,git,jj,cache,output,temp}/**",
      "**/{vite,vitest,eslint,prettier}.config.*",
    ],
  },
  resolve: {
    alias: {
      "~": "/src",
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
