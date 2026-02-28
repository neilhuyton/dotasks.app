// vite.config.ts

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
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
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: { assets: "./dist/**" },
        debug: true,
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
      // ── Coverage settings ────────────────────────────────
      coverage: {
        provider: "v8", // ← this is what you just installed
        reporter: ["text", "json", "html"], // text = console, html = nice report
        reportsDirectory: "./coverage", // where the report goes
        exclude: [
          "node_modules/**",
          "dist/**",
          "**/*.d.ts",
          "**/*.config.*",
          "**/*.test.*",
          "**/*.spec.*",
        ],
        // Optional but very useful:
        all: true, // show coverage for untested files too
        include: ["src/**/*.{ts,tsx}"], // only count source files
        thresholds: {
          lines: 80,
          branches: 70,
          functions: 75,
          statements: 80,
        },
      },
    },
    build: {
      sourcemap: true,
    },
    define: {
      "import.meta.env.VITE_TRPC_URL": JSON.stringify(env.VITE_TRPC_URL),
    },
  };
});
