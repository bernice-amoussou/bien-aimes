"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { SermonPlayer } from "@/components/player/player-controls";
import { Container } from "@/components/ui/container";
import { formatDate, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import { getTotalDuration } from "@/lib/sermon-utils";
import type { Sermon } from "@/types/sermon";
import { SermonList } from "./sermon-list-item";

/** Page d'une prédication : l'essentiel en haut, le lecteur juste en dessous. */
export function SermonDetail({ sermon, related }: { sermon: Sermon; related: Sermon[] }) {
  const { t, locale } = useI18n();
  const totalDuration = getTotalDuration(sermon);
  const meta = [
    formatDate(sermon.date, locale),
    totalDuration !== null ? formatDuration(totalDuration) : null,
    t.sermon.languageNames[sermon.language],
  ].filter(Boolean);

  return (
    <article>
      <Container narrow className="pt-2 pb-10 sm:pt-6">
        <Link
          href="/predications"
          className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-[15px] text-ink-muted transition-colors hover:text-forest-700"
        >
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
          {t.detail.backToLibrary}
        </Link>

        <h1 className="mt-3 font-display text-[2rem] leading-[1.1] text-ink sm:text-5xl">{sermon.title}</h1>
        <p className="mt-3 text-[15px] text-ink-muted">
          <time dateTime={sermon.date}>{meta[0]}</time>
          {meta.slice(1).map((item) => ` · ${item}`)}
        </p>

        <ul aria-label={t.sermon.references} className="mt-4 flex flex-wrap gap-2">
          {sermon.scriptureReferences.map((reference) => (
            <li
              key={reference}
              className="inline-flex items-center gap-2 rounded-full bg-sand-100 px-3.5 py-2 text-[15px] text-ink"
            >
              <BookOpen aria-hidden="true" className="size-4 text-gold-700" strokeWidth={1.75} />
              {reference}
            </li>
          ))}
        </ul>

        <section aria-label={t.detail.listen} className="mt-6">
          <SermonPlayer sermon={sermon} />
        </section>

        {sermon.notes && (
          <section aria-labelledby="notes-title" className="mt-10">
            <h2 id="notes-title" className="font-display text-2xl text-ink">
              {t.detail.notes}
            </h2>
            <p className="mt-3 text-[17px] leading-[1.75] whitespace-pre-line text-ink-soft">{sermon.notes}</p>
          </section>
        )}

      </Container>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="bg-paper-deep/50">
          <Container narrow className="py-10">
            <h2 id="related-title" className="font-display text-2xl text-ink">
              {t.detail.related}
            </h2>
            <div className="mt-3">
              <SermonList sermons={related} />
            </div>
          </Container>
        </section>
      )}
    </article>
  );
}

export function SermonDetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <Container narrow className="pt-4 pb-10 sm:pt-8">
        <div className="h-5 w-32 rounded-full bg-line" />
        <div className="mt-6 h-10 w-4/5 rounded-xl bg-line" />
        <div className="mt-4 h-4 w-48 rounded-full bg-line" />
        <div className="mt-5 h-9 w-56 rounded-full bg-line" />
        <div className="mt-6 h-52 rounded-3xl bg-line/70" />
      </Container>
    </div>
  );
}
