"use client";

import { ArrowRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/lib/i18n/locale-provider";

export function AboutContent() {
  const { t } = useI18n();

  return (
    <Container className="py-14 sm:py-20">
      <ol className="grid gap-x-12 gap-y-12 md:grid-cols-3">
        {t.about.sections.map((section, index) => (
          <li key={section.title} className="border-t border-line-strong pt-6">
            <span className="font-display text-2xl text-gold-700 italic tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="mt-4 font-display text-2xl text-ink">{section.title}</h2>
            <p className="mt-3 text-[16px] leading-[1.75] text-ink-soft">{section.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 flex flex-col gap-8 border-t border-line pt-10 lg:flex-row lg:items-start lg:justify-between">
        <Alert tone="notice" title={t.about.statusTitle} className="max-w-2xl">
          {t.about.statusText}
        </Alert>
        <ButtonLink href="/predications" size="lg">
          {t.about.cta}
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </ButtonLink>
      </div>
    </Container>
  );
}
