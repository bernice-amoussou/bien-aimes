"use client";

import { Headphones, LockKeyhole } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/lib/i18n/locale-provider";

export function AboutContent() {
  const { t } = useI18n();

  return (
    <Container narrow className="py-6 sm:py-10">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t.about.title}</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{t.about.lead}</p>

      <div className="mt-8 space-y-7">
        {t.about.sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-[1.4rem] text-ink">{section.title}</h2>
            <p className="mt-2 text-[17px] leading-relaxed text-ink-soft">{section.text}</p>
          </section>
        ))}
      </div>

      <ButtonLink href="/predications" size="xl" className="mt-8 w-full sm:w-auto">
        <Headphones aria-hidden="true" className="size-5" strokeWidth={2} />
        {t.about.cta}
      </ButtonLink>

      <section className="mt-10 rounded-3xl bg-paper-deep/70 p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold text-ink">{t.about.teamTitle}</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{t.about.teamText}</p>
        <ButtonLink href="/connexion" variant="secondary" size="lg" className="mt-4 w-full sm:w-auto">
          <LockKeyhole aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t.nav.login}
        </ButtonLink>
      </section>
    </Container>
  );
}
