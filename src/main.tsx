// src/main.tsx

import { createRoot } from "react-dom/client";
import { Root } from "./app/Root";
import "./index.css";
import { StrictMode } from "react";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.debug("Service Worker registered:", reg.scope))
      .catch((err) => console.warn("Service Worker registration failed:", err));
  });
}
