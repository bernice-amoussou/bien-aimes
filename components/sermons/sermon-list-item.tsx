"use client";

import { ArrowUpRight, Clock, Headphones, UserRound } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDateParts, formatDuration, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import { getTotalDuration } from "@/lib/sermon-utils";
import type { Sermon } from "@/types/sermon";
import { ScriptureReferences } from "./scripture-references";

/**
 * Ligne éditoriale d'une prédication : date en exergue, titre en serif,
 * puis versets, prédicateur et informations audio.
 */
export function SermonListItem({ sermon, headingLevel = "h3" }: { sermon: Sermon; headingLevel?: "h2" | "h3" }) {
  const { t, locale } = useI18n();
  const parts = formatDateParts(sermon.date, locale);
  const totalDuration = getTotalDuration(sermon);
  const Heading = headingLevel;
  const fileCount = sermon.audioFiles.length;

  return (
    <article className="group relative grid grid-cols-[3.5rem_1fr] gap-x-5 py-6 sm:grid-cols-[5rem_1fr_auto] sm:gap-x-8 sm:py-7">
      <div className="pt-1">
        <time dateTime={sermon.date} className="block text-center">
          <span className="block font-display text-3xl leading-none text-ink sm:text-[2.5rem]">
            {parts.day}
          </span>
          <span className="eyebrow mt-1.5 block text-[10px] text-ink-muted sm:text-[11px]">
            {parts.month} {parts.year}
          </span>
          <span className="sr-only">{formatDate(sermon.date, locale)}</span>
        </time>
      </div>

      <div className="min-w-0">
        <Heading className="font-display text-xl leading-snug text-ink sm:text-2xl">
          <Link
            href={`/predications/${sermon.id}`}
            className="decoration-forest-300 decoration-1 underline-offset-[5px] transition-colors group-hover:text-forest-700 group-hover:underline after:absolute after:inset-0 after:content-['']"
          >
            {sermon.title}
          </Link>
        </Heading>
        <ScriptureReferences
          references={sermon.scriptureReferences}
          label={t.sermon.references}
          className="mt-2"
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-ink-muted">
          {sermon.preacher && (
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              <span className="sr-only">{t.sermon.preacher} : </span>
              {sermon.preacher}
            </span>
          )}
          {sermon.language !== locale && (
            <span className="rounded-sm border border-line-strong px-1.5 py-px text-[11px] tracking-wide text-ink-soft uppercase">
              <span className="sr-only">{t.sermon.language} : </span>
              {t.sermon.languageNames[sermon.language]}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Headphones aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            {t.sermon.recordings(fileCount)}
          </span>
          {fileCount > 0 && (
            <span className="inline-flex items-center gap-1.5 sm:hidden">
              <Clock aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              {totalDuration !== null ? formatDuration(totalDuration) : t.sermon.durationUnknown}
            </span>
          )}
        </div>
      </div>

      <div className="hidden items-center gap-4 self-start pt-2 sm:flex">
        {fileCount > 0 && (
          <span
            className={cn(
              "text-[13px] tabular-nums",
              totalDuration !== null ? "text-ink-soft" : "text-ink-muted",
            )}
          >
            {totalDuration !== null ? formatDuration(totalDuration) : t.sermon.durationUnknown}
          </span>
        )}
        <ArrowUpRight
          aria-hidden="true"
          className="size-5 text-ink-muted/60 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest-700"
          strokeWidth={1.5}
        />
      </div>
    </article>
  );
}

export function SermonList({ sermons, headingLevel }: { sermons: Sermon[]; headingLevel?: "h2" | "h3" }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {sermons.map((sermon) => (
        <li key={sermon.id}>
          <SermonListItem sermon={sermon} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
