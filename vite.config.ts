// vite.config.ts

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

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
    build: {
      sourcemap: true,
    },
    define: {
      "import.meta.env.VITE_TRPC_URL": JSON.stringify(env.VITE_TRPC_URL),
    },
  };
});
