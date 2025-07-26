import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [solid()],
  root: "src",

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
