import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      // Only the built app shell (JS/CSS/HTML/icons) is precached here — actual
      // question/progress data caching is handled separately by our own
      // IndexedDB layer (src/offline/*), which is safe for auth-sensitive,
      // per-user Supabase data in a way a generic Workbox runtime-caching rule
      // wouldn't be. No runtimeCaching is configured for the Supabase domain on
      // purpose: every API/RPC call should always hit the network (or be queued
      // by our own offline logic), never be served from a service-worker cache.
      manifest: {
        name: "BECE Companion",
        short_name: "BECE Companion",
        description: "Offline-friendly BECE past questions, practice, mock exams, and progress tracking.",
        theme_color: "#1B2A4A",
        background_color: "#FAF7F0",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // Precache the built app shell only; navigation fallback keeps client-side
        // routing (react-router) working when the app is opened while offline.
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"]
      }
    })
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
});
