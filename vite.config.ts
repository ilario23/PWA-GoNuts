import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "icons/*.png"],
      manifest: {
        name: "GoNuts",
        short_name: "GoNuts",
        description:
          "GoNuts with your budget - Manage your personal finances offline-first",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        id: "/",
        categories: ["finance", "productivity", "utilities"],
        shortcuts: [
          {
            name: "Add Transaction",
            short_name: "Add",
            description: "Quickly add a new transaction",
            url: "/?action=add",
            icons: [{ src: "icons/icon-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Statistics",
            short_name: "Stats",
            description: "View your spending statistics",
            url: "/statistics",
            icons: [{ src: "icons/icon-192x192.png", sizes: "192x192" }],
          },
        ],
        icons: [
          {
            src: "icons/icon-48x48.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-256x256.png",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache ALL JS/CSS chunks including lazy-loaded ones
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,json}"],
        // Don't precache source maps
        globIgnores: ["**/*.map"],
        // Navigation fallback for SPA - critical for offline
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          // HTML pages - Network First with fast fallback
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              networkTimeoutSeconds: 3, // Fallback to cache after 3s
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // JS and CSS - Stale While Revalidate for fast loads
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Images - Cache First (they rarely change)
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Fonts - Cache First (they never change)
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Supabase Auth API - Network Only with offline fallback handling
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase") &&
              url.pathname.includes("/auth/"),
            handler: "NetworkOnly",
            options: {
              backgroundSync: {
                name: "auth-queue",
                options: {
                  maxRetentionTime: 24 * 60, // Retry for 24 hours
                },
              },
            },
          },
          // Supabase Data API calls - Network First with offline fallback
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase") &&
              !url.pathname.includes("/auth/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target Safari 14+ for iOS compatibility
    target: ["es2020", "safari14"],
    // Adjust warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["lucide-react", "clsx", "tailwind-merge"],
          "db-vendor": ["@supabase/supabase-js", "dexie", "dexie-react-hooks"],
          "chart-vendor": ["recharts"],
          "utils-vendor": ["date-fns", "i18next", "react-i18next", "zod"],
        },
      },
    },
  },
});
