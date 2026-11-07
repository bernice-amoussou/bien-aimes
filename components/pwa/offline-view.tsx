"use client";

import { RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/lib/i18n/locale-provider";

export function OfflineView() {
  const { t } = useI18n();

  return (
    <Container className="flex flex-col items-center py-24 text-center sm:py-32">
      <span className="flex size-14 items-center justify-center rounded-full border border-line-strong bg-surface text-gold-700">
        <WifiOff aria-hidden="true" className="size-6" strokeWidth={1.5} />
      </span>
      <h1 className="mt-8 font-display text-4xl text-ink sm:text-5xl">{t.offline.title}</h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">{t.offline.text}</p>
      <Button variant="secondary" className="mt-8" onClick={() => window.location.reload()}>
        <RotateCw aria-hidden="true" className="size-4" strokeWidth={1.75} />
        {t.offline.retry}
      </Button>
    </Container>
  );
}
