"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/lib/i18n/locale-provider";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-line-strong bg-surface text-danger-600">
        <TriangleAlert aria-hidden="true" className="size-6" strokeWidth={1.5} />
      </span>
      <h1 className="mt-8 font-display text-4xl text-ink">{t.errorPage.title}</h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">{t.errorPage.text}</p>
      <Button variant="secondary" className="mt-8" onClick={() => retry()}>
        <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.75} />
        {t.errorPage.retry}
      </Button>
    </Container>
  );
}
