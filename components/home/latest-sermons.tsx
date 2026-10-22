"use client";

import { ArrowRight, Library } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { SermonList } from "@/components/sermons/sermon-list-item";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { Sermon } from "@/types/sermon";

export function LatestSermons({ sermons }: { sermons: Sermon[] }) {
  const { t } = useI18n();

  return (
    <section aria-labelledby="latest-title">
      <Container className="py-8 sm:py-12">
        <h2 id="latest-title" className="font-display text-2xl text-ink sm:text-3xl">
          {t.home.latest}
        </h2>
        {sermons.length === 0 ? (
          <EmptyState icon={Library} title={t.library.archiveEmpty} className="mt-4">
            {t.library.archiveEmptyText}
          </EmptyState>
        ) : (
          <>
            <div className="mt-3">
              <SermonList sermons={sermons} />
            </div>
            <ButtonLink href="/predications" variant="secondary" size="lg" className="mt-6 w-full sm:w-auto">
              {t.home.viewAll}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </ButtonLink>
          </>
        )}
      </Container>
    </section>
  );
}
