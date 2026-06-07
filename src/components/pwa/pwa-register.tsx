"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // In development we must never let a service worker serve a cached app
    // shell, otherwise refreshes return stale HTML/JS and recent UI changes
    // appear to "revert". Unregister any existing worker and clear all caches.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            void registration.unregister();
          });
        })
        .catch(() => {
          // Non-blocking cleanup.
        });

      if (typeof caches !== "undefined") {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {
            // Non-blocking cleanup.
          });
      }

      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
