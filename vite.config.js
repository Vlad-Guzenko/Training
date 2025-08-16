// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/Training/", // имя репозитория на GitHub Pages
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        cleanupOutdatedCaches: true,
        // SPA-фоллбек под base, чтобы роутер и SW работали корректно
        navigateFallback: "/Training/index.html",
      },
      manifest: {
        name: "Персональные тренировки",
        short_name: "Train",
        description: "Конструктор прогрессирующих тренировок",
        theme_color: "#111827",
        background_color: "#111827",
        display: "standalone",
        start_url: "/Training/", // важно: с префиксом base
        scope: "/Training/",     // важно: scope = base
        icons: [
          { src: "/Training/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/Training/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/Training/pwa-maskable.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      }
    }),
  ],
});
