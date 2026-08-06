"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker. Only enabled in production — in dev it
 * would cache hot-reloaded assets and confuse the dev server.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration is progressive enhancement — silent failure is fine.
      });
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
