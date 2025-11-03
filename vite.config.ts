import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [solid()],
  root: "src",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000/",
        changeOrigin: true,
      },
    },
  },
}));
