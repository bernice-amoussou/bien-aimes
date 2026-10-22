"use client";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { useI18n } from "@/lib/i18n/locale-provider";

type IntroKey = "library" | "about";

/** En-tête de page traduit, pour les pages serveur qui n'accèdent pas au contexte de langue. */
export function PageIntro({ section }: { section: IntroKey }) {
  const { t } = useI18n();
  const content: Record<IntroKey, { eyebrow: string; title: string; description: string }> = {
    library: t.library,
    about: { eyebrow: t.about.eyebrow, title: t.about.title, description: t.about.lead },
  };
  const { eyebrow, title, description } = content[section];

  return (
    <div className="border-b border-line bg-paper-deep/50">
      <Container className="py-14 sm:py-20">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} />
      </Container>
    </div>
  );
}
