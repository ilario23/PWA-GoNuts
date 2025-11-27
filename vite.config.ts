import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "masked-icon.svg",
        "robots.txt",
      ],
      manifest: {
        name: "Personal Expense Tracker",
        short_name: "Expenses",
        description: "Manage your personal finances offline-first",
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
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Statistics",
            short_name: "Stats",
            description: "View your spending statistics",
            url: "/statistics",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
          },
        ],
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512-maskable.png",
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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core - rarely changes, cache well
          if (id.includes("node_modules/react-dom")) {
            return "react-dom";
          }
          if (id.includes("node_modules/react/")) {
            return "react-core";
          }
          // Router
          if (id.includes("node_modules/react-router")) {
            return "router";
          }
          // Radix UI components
          if (id.includes("node_modules/@radix-ui")) {
            return "ui-radix";
          }
          // Recharts - split into core and components
          if (id.includes("node_modules/recharts")) {
            return "charts";
          }
          if (id.includes("node_modules/d3-") || id.includes("node_modules/victory-vendor")) {
            return "charts-d3";
          }
          // Supabase
          if (id.includes("node_modules/@supabase")) {
            return "supabase";
          }
          // Database
          if (id.includes("node_modules/dexie")) {
            return "database";
          }
          // i18n
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "i18n";
          }
          // Date utilities
          if (id.includes("node_modules/date-fns")) {
            return "date-utils";
          }
          // Lucide icons - large but tree-shakeable
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
          // Zod validation
          if (id.includes("node_modules/zod")) {
            return "validation";
          }
          // Other utilities
          if (
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/tailwind-merge") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/uuid")
          ) {
            return "utils";
          }
        },
      },
    },
    // Adjust warning limit
    chunkSizeWarningLimit: 350,
  },
});
