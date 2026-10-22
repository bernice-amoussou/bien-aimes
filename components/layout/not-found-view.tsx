"use client";

import { ArrowLeft, FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/lib/i18n/locale-provider";

export function NotFoundView({ variant = "page" }: { variant?: "page" | "sermon" }) {
  const { t } = useI18n();
  const isSermon = variant === "sermon";

  return (
    <Container className="flex flex-col items-center py-24 text-center sm:py-32">
      <span className="flex size-14 items-center justify-center rounded-full border border-line-strong bg-surface text-gold-700">
        <FileQuestion aria-hidden="true" className="size-6" strokeWidth={1.5} />
      </span>
      <p className="eyebrow mt-8 text-gold-700">404</p>
      <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
        {isSermon ? t.detail.notFoundTitle : t.notFound.title}
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">
        {isSermon ? t.detail.notFoundText : t.notFound.text}
      </p>
      <ButtonLink href={isSermon ? "/predications" : "/"} variant="secondary" className="mt-8">
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        {isSermon ? t.detail.backToLibrary : t.notFound.home}
      </ButtonLink>
    </Container>
  );
}
