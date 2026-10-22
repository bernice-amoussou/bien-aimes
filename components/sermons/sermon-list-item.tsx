"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { PlayButton } from "@/components/player/player-controls";
import { formatDate, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import { getTotalDuration } from "@/lib/sermon-utils";
import type { Sermon } from "@/types/sermon";

/**
 * Ligne d'une prédication : bouton de lecture immédiate à gauche,
 * puis thème, date et versets. Toute la ligne ouvre la page de la prédication.
 */
export function SermonListItem({ sermon, headingLevel = "h3" }: { sermon: Sermon; headingLevel?: "h2" | "h3" }) {
  const { t, locale } = useI18n();
  const totalDuration = getTotalDuration(sermon);
  const Heading = headingLevel;
  const meta = [
    formatDate(sermon.date, locale),
    totalDuration !== null ? formatDuration(totalDuration) : null,
    sermon.language !== locale ? t.sermon.languageNames[sermon.language] : null,
  ].filter(Boolean);

  return (
    <article className="group relative -mx-3 flex items-center gap-4 rounded-2xl px-3 py-3.5 transition-colors hover:bg-paper-deep/70">
      <PlayButton sermon={sermon} />
      <div className="min-w-0 flex-1">
        <Heading className="font-display text-[1.25rem] leading-snug text-ink">
          <Link
            href={`/predications/${sermon.id}`}
            className="line-clamp-2 after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:text-forest-700"
          >
            {sermon.title}
          </Link>
        </Heading>
        <p className="mt-1 text-sm text-ink-muted">{meta.join(" · ")}</p>
        {sermon.scriptureReferences.length > 0 && (
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            <span className="sr-only">{t.sermon.references} : </span>
            {sermon.scriptureReferences.join(" · ")}
          </p>
        )}
      </div>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-ink-muted/50 transition-colors group-hover:text-forest-700"
        strokeWidth={1.75}
      />
    </article>
  );
}

export function SermonList({ sermons, headingLevel }: { sermons: Sermon[]; headingLevel?: "h2" | "h3" }) {
  return (
    <ul className="space-y-1">
      {sermons.map((sermon) => (
        <li key={sermon.id}>
          <SermonListItem sermon={sermon} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
