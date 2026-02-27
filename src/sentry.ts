// src/sentry.ts

import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: "dotasks.app@0.0.0",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0, // For testing; reduce later
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
  debug: import.meta.env.DEV,
});
Sentry.captureMessage("App loaded – Sentry test from prod", "info");
