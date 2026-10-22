"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { formatDate, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import { getTotalDuration } from "@/lib/sermon-utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Sermon } from "@/types/sermon";
import { SermonList } from "./sermon-list-item";
import { SermonRecordings } from "./sermon-recordings";

export function SermonDetail({ sermon, related }: { sermon: Sermon; related: Sermon[] }) {
  const { t, locale } = useI18n();
  const totalDuration = getTotalDuration(sermon);

  return (
    <article>
      <header className="border-b border-line bg-paper-deep/50">
        <Container className="pt-8 pb-12 sm:pb-16">
          <Link
            href="/predications"
            className="inline-flex items-center gap-2 rounded-sm text-sm text-ink-muted transition-colors hover:text-forest-700"
          >
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
            {t.detail.backToLibrary}
          </Link>
          <p className="eyebrow mt-10 text-gold-700">
            <time dateTime={sermon.date}>{formatDate(sermon.date, locale)}</time>
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.06] text-ink sm:text-[3.5rem]">
            {sermon.title}
          </h1>
          <ul aria-label={t.sermon.references} className="mt-7 flex flex-wrap gap-2">
            {sermon.scriptureReferences.map((reference) => (
              <li
                key={reference}
                className="inline-flex items-center gap-2 rounded-sm border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink-soft"
              >
                <BookOpen aria-hidden="true" className="size-3.5 text-gold-500" strokeWidth={1.75} />
                {reference}
              </li>
            ))}
          </ul>
        </Container>
      </header>

      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_18rem] lg:gap-16">
        <div className="min-w-0 space-y-14">
          <section id="ecouter" aria-labelledby="recordings-title" className="scroll-mt-24">
            <h2 id="recordings-title" className="mb-5 font-display text-2xl text-ink">
              {t.detail.recordings}
            </h2>
            <SermonRecordings files={sermon.audioFiles} />
          </section>

          {sermon.notes && (
            <section aria-labelledby="notes-title">
              <h2 id="notes-title" className="mb-4 font-display text-2xl text-ink">
                {t.detail.notes}
              </h2>
              <p className="max-w-2xl text-[17px] leading-[1.75] whitespace-pre-line text-ink-soft">
                {sermon.notes}
              </p>
            </section>
          )}
        </div>

        <aside className="lg:pt-12">
          <dl className="divide-y divide-line border-y border-line text-sm">
            <div className="flex justify-between gap-4 py-3.5">
              <dt className="text-ink-muted">{t.sermon.date}</dt>
              <dd className="text-right text-ink">{formatDate(sermon.date, locale)}</dd>
            </div>
            {sermon.preacher && (
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-ink-muted">{t.sermon.preacher}</dt>
                <dd className="text-right text-ink">{sermon.preacher}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 py-3.5">
              <dt className="text-ink-muted">{t.sermon.language}</dt>
              <dd className="text-right text-ink">{t.sermon.languageNames[sermon.language]}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3.5">
              <dt className="text-ink-muted">{t.detail.recordings}</dt>
              <dd className="text-right text-ink">{sermon.audioFiles.length}</dd>
            </div>
            {sermon.audioFiles.length > 0 && (
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-ink-muted">{t.sermon.duration}</dt>
                <dd className="text-right text-ink">
                  {totalDuration !== null ? formatDuration(totalDuration) : t.sermon.durationUnknown}
                </dd>
              </div>
            )}
          </dl>
          {!isSupabaseConfigured() && (
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">{t.footer.demoNotice}</p>
          )}
        </aside>
      </Container>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="border-t border-line bg-paper-deep/40">
          <Container className="py-14 sm:py-16">
            <h2 id="related-title" className="mb-6 font-display text-3xl text-ink">
              {t.detail.related}
            </h2>
            <SermonList sermons={related} />
          </Container>
        </section>
      )}
    </article>
  );
}

export function SermonDetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="border-b border-line bg-paper-deep/50">
        <Container className="pt-8 pb-16">
          <div className="h-4 w-36 rounded-sm bg-line" />
          <div className="mt-10 h-3 w-28 rounded-sm bg-line" />
          <div className="mt-5 h-12 w-3/4 rounded-sm bg-line" />
          <div className="mt-7 h-8 w-64 rounded-sm bg-line" />
        </Container>
      </div>
      <Container className="py-16">
        <div className="h-24 max-w-3xl rounded-lg bg-line/70" />
      </Container>
    </div>
  );
}
