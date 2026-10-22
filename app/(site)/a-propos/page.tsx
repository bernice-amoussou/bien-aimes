import type { Metadata } from "next";
import { AboutContent } from "@/components/layout/about-content";

export const metadata: Metadata = {
  title: "À propos",
  description: "Bien-aimés, l'archive des prédications de l'église.",
};

export default function AboutPage() {
  return <AboutContent />;
}
