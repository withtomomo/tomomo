import { defineConfig } from "electron-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ["node-pty"],
      },
    },
  },
  preload: {},
  renderer: {
    plugins: [tailwindcss()],
  },
});
