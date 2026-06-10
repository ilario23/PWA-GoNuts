import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./i18n";

// #7 - Filter Recharts dimension warnings in development
// These occur during initial render when containers haven't been measured yet
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      message.includes("The width") &&
      message.includes("of chart should be greater than 0")
    ) {
      return; // Suppress Recharts dimension warning
    }
    originalWarn.apply(console, args);
  };
}

// Remove loading indicator once React takes over
const loadingEl = document.getElementById("app-loading");
if (loadingEl) {
  loadingEl.style.display = "none";
}

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {/* Top-level boundary: i18n loads locale bundles on demand and
          components suspend until translations are ready */}
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </StrictMode>
  );
} catch (error) {
  console.error("Failed to render app:", error);
  // Show error in the fallback error UI
  const errorDiv = document.getElementById("app-error");
  if (errorDiv) {
    errorDiv.classList.add("show");
    const msgEl = document.getElementById("error-message");
    const stackEl = document.getElementById("error-stack");
    if (msgEl) msgEl.textContent = (error as Error)?.message || "Render failed";
    if (stackEl) stackEl.textContent = (error as Error)?.stack || String(error);
  }
}
