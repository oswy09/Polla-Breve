import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// --- Suppress runtime errors from browser extensions (MetaMask, etc.) ---
// These bubble through window error events and trigger the CRA dev overlay,
// even though they have nothing to do with our app.
const isExtensionError = (msg, src, stack) => {
  const blob = `${msg || ""} ${src || ""} ${stack || ""}`.toLowerCase();
  return (
    blob.includes("chrome-extension://") ||
    blob.includes("moz-extension://") ||
    blob.includes("safari-extension://") ||
    blob.includes("metamask") ||
    blob.includes("inpage.js") ||
    blob.includes("contentscript")
  );
};

window.addEventListener(
  "error",
  (e) => {
    const stack = e?.error && e.error.stack ? e.error.stack : "";
    if (isExtensionError(e?.message, e?.filename, stack)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    return undefined;
  },
  true,
);

window.addEventListener(
  "unhandledrejection",
  (e) => {
    const r = e?.reason;
    const msg = (r && (r.message || r.toString())) || "";
    const stack = r && r.stack ? r.stack : "";
    if (isExtensionError(msg, "", stack)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    return undefined;
  },
  true,
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
