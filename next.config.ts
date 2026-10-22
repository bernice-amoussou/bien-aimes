import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Développement : autorise l'ouverture du site depuis le réseau local
  // (ex. http://192.168.1.81:3000 sur un téléphone). Sans cela, Next.js bloque
  // ses scripts et la page s'affiche sans aucune interaction possible.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
