// vite.config.ts

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tanstackRouter({
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/types/routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
    }),
    sentryVitePlugin({
      org: "your-org-slug",
      project: "your-project-slug",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: 'your-app@1.0.0',
      },
      sourcemaps: { assets: "./dist/**" },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  test: {
    silent: false,
    environment: "jsdom",
    setupFiles: ["./__tests__/setupTests.ts"],
    env: {
      VITE_TRPC_URL: "/trpc",
    },
    globals: true,
    testTimeout: 15000,
    deps: {
      optimizer: {
        web: {
          include: [
            "@testing-library/react",
            "@testing-library/jest-dom",
            "@tanstack/history",
          ],
        },
      },
    },
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**/*", "node_modules", "dist", ".idea", ".git", ".cache"],
  },
  define: {
    "import.meta.env.VITE_TRPC_URL": JSON.stringify(process.env.VITE_TRPC_URL),
  },
});
