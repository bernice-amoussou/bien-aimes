"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import { HeroVisual } from "./hero-visual";

export interface ArchiveSummary {
  sermonCount: number;
  audioFileCount: number;
  /** Date ISO de la plus ancienne prédication, `null` si l'archive est vide. */
  oldestDate: string | null;
}

export function Hero({ archive }: { archive: ArchiveSummary }) {
  const { t, locale } = useI18n();

  return (
    <section className="relative overflow-hidden border-b border-line">
      <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24">
        <div>
          <p className="eyebrow flex items-center gap-3 text-gold-700">
            <span aria-hidden="true" className="h-px w-8 bg-gold-500" />
            {t.home.hero.eyebrow}
          </p>
          <h1 className="mt-6 font-display text-[2.75rem] leading-[1.02] text-ink sm:text-6xl lg:text-[4.25rem]">
            {t.home.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            {t.home.hero.subtitle}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/predications" size="lg">
              {t.home.hero.primaryCta}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </ButtonLink>
            <ButtonLink href="/a-propos" size="lg" variant="secondary">
              {t.home.hero.secondaryCta}
            </ButtonLink>
          </div>
          <p className="mt-10 font-display text-lg text-ink-muted italic">
            « {t.common.tagline.replace(/\.$/, "")} »
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-sm lg:mr-0 lg:max-w-[26rem]">
          <HeroVisual label={t.home.hero.visualLabel} />
          <span aria-hidden="true" className="block h-px w-full bg-line-strong" />

          {archive.sermonCount > 0 && (
            <Link
              href="/predications"
              className="group relative mx-4 -mt-14 block rounded-md border border-line bg-surface/95 p-5 shadow-lift backdrop-blur transition-colors hover:border-forest-300 sm:mx-8 lg:absolute lg:-bottom-8 lg:-left-10 lg:mx-0 lg:mt-0 lg:w-72"
            >
              <p className="eyebrow text-[10px] text-gold-700">{t.home.hero.archive}</p>
              <p className="mt-2 font-display text-2xl leading-tight text-ink group-hover:text-forest-700">
                {t.home.hero.archiveSermons(archive.sermonCount)}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {t.home.hero.archiveFiles(archive.audioFileCount)}
              </p>
              <p className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-[13px] text-ink-muted">
                {archive.oldestDate && (
                  <span>{t.home.hero.archiveSince(formatDate(archive.oldestDate, locale))}</span>
                )}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.5}
                />
              </p>
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}
