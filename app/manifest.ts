import type { MetadataRoute } from "next";

/** Manifeste PWA : permet d'installer le site sur l'écran d'accueil (Android, iOS, ordinateur). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bien-aimés — La Parole qui nous rassemble",
    short_name: "Bien-aimés",
    description: "Les prédications de l'église, archivées pour être écoutées, retrouvées et partagées.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f3",
    theme_color: "#faf8f3",
    categories: ["religion", "education", "music"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      {
        name: "Prédications",
        short_name: "Prédications",
        url: "/predications",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Nouvelle prédication",
        short_name: "Ajouter",
        url: "/admin/predications/nouvelle",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
