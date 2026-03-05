// src/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Root } from "./app/Root";

import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// Add global error logging for auth hangs
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('lock') || event.reason?.message?.includes('session')) {
    console.error('[Global] Unhandled auth rejection:', event.reason)
  }
})

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
