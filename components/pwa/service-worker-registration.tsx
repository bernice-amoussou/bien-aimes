"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (installation de l'application, consultation hors ligne).
 * Désactivé en développement pour ne pas servir d'anciennes versions des pages.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Nettoie un worker laissé par un `next start` précédent sur la même adresse.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sans service worker, le site fonctionne normalement : rien à signaler à l'utilisateur.
    });
  }, []);

  return null;
}
