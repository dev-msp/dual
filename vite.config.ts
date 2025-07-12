import tailwind from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [tailwind(), solid()],

  server: {
    port: 1420,
    strictPort: true,
    host: false,
    hmr: undefined,
  },
}));
