import { notFound } from "next/navigation";

/*
 * Section « À propos » désactivée : la page renvoie 404 et les liens sont
 * commentés dans site-header.tsx et site-footer.tsx.
 * Pour la rétablir, remplacez ce fichier par le code commenté ci-dessous.
 *
 * import type { Metadata } from "next";
 * import { AboutContent } from "@/components/layout/about-content";
 *
 * export const metadata: Metadata = {
 *   title: "À propos",
 *   description: "Bien-aimés, l'archive des prédications de l'église.",
 * };
 *
 * export default function AboutPage() {
 *   return <AboutContent />;
 * }
 */

export default function AboutPage() {
  notFound();
}
