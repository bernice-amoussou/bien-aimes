"use client";

import { Container } from "@/components/ui/container";
import { FEATURED_VERSE } from "@/data/demo-verse";
import { useI18n } from "@/lib/i18n/locale-provider";

export function VerseSection() {
  const { t, locale } = useI18n();

  return (
    <section aria-label={t.home.verse.eyebrow} className="border-y border-line bg-sand-100">
      <Container className="py-20 sm:py-28">
        <figure className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-gold-700">{t.home.verse.eyebrow}</p>
          <span aria-hidden="true" className="mx-auto mt-6 block h-10 w-px bg-gold-500/60" />
          <blockquote className="mt-8">
            <p className="font-display text-[1.75rem] leading-snug text-ink italic sm:text-[2.5rem] sm:leading-[1.25]">
              « {FEATURED_VERSE.text[locale]} »
            </p>
          </blockquote>
          <figcaption className="mt-8 text-sm text-ink-soft">
            <cite className="font-medium not-italic">{FEATURED_VERSE.reference[locale]}</cite>
            <span aria-hidden="true" className="mx-2 text-ink-muted">
              —
            </span>
            <span className="text-ink-muted">{FEATURED_VERSE.translation[locale]}</span>
          </figcaption>
          <p className="mt-6 text-xs text-ink-muted">{t.home.verse.exampleNote}</p>
        </figure>
      </Container>
    </section>
  );
}
