import type { Metadata } from "next";
import { AboutContent } from "@/components/layout/about-content";
import { PageIntro } from "@/components/layout/page-intro";

export const metadata: Metadata = {
  title: "À propos",
  description: "Bien-aimés, l'archive des prédications de l'église.",
};

export default function AboutPage() {
  return (
    <>
      <PageIntro section="about" />
      <AboutContent />
    </>
  );
}
