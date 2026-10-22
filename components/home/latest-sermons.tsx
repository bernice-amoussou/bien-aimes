"use client";

import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { SermonList } from "@/components/sermons/sermon-list-item";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { Sermon } from "@/types/sermon";

export function LatestSermons({ sermons }: { sermons: Sermon[] }) {
  const { t } = useI18n();
  const viewAll = (
    <ButtonLink href="/predications" variant="secondary">
      {t.home.latest.viewAll}
      <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </ButtonLink>
  );

  return (
    <section aria-labelledby="latest-title" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={t.home.latest.eyebrow}
          id="latest-title"
          title={t.home.latest.title}
          description={t.home.latest.description}
          action={<div className="hidden sm:block">{viewAll}</div>}
        />
        <div className="mt-10">
          <SermonList sermons={sermons} />
        </div>
        <div className="mt-8 sm:hidden">{viewAll}</div>
      </Container>
    </section>
  );
}
