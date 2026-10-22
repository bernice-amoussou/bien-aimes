"use client";

import { ArrowRight, CalendarDays, Headphones, UserRound } from "lucide-react";
import { useState } from "react";
import { AudioPlayer } from "@/components/audio/audio-player";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ScriptureReferences } from "@/components/sermons/scripture-references";
import { cn } from "@/lib/cn";
import { formatDate, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { Sermon } from "@/types/sermon";

export function FeaturedSermon({ sermon }: { sermon: Sermon }) {
  const { t, locale } = useI18n();
  const [selectedId, setSelectedId] = useState(sermon.audioFiles[0]?.id ?? null);
  const selected = sermon.audioFiles.find((file) => file.id === selectedId) ?? null;

  return (
    <section aria-labelledby="featured-title" className="bg-forest-800 text-paper">
      <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <p className="eyebrow flex items-center gap-3 text-gold-400">
            <span aria-hidden="true" className="h-px w-8 bg-gold-400/70" />
            {t.home.featured.eyebrow}
          </p>
          <p className="mt-3 text-sm text-paper/60">{t.home.featured.title}</p>
          <h2 id="featured-title" className="mt-6 font-display text-4xl leading-[1.08] sm:text-5xl">
            {sermon.title}
          </h2>

          <dl className="mt-8 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-paper/80">
              <dt className="sr-only">{t.sermon.date}</dt>
              <CalendarDays aria-hidden="true" className="size-3.5 text-gold-400" strokeWidth={1.75} />
              <dd>
                <time dateTime={sermon.date}>{formatDate(sermon.date, locale)}</time>
              </dd>
            </div>
            <div>
              <dt className="sr-only">{t.sermon.references}</dt>
              <dd>
                <ScriptureReferences
                  references={sermon.scriptureReferences}
                  label={t.sermon.references}
                  tone="light"
                />
              </dd>
            </div>
            {sermon.preacher && (
              <div className="flex items-center gap-2 text-paper/80">
                <dt className="sr-only">{t.sermon.preacher}</dt>
                <UserRound aria-hidden="true" className="size-3.5 text-gold-400" strokeWidth={1.75} />
                <dd>{sermon.preacher}</dd>
              </div>
            )}
          </dl>

          {sermon.notes && (
            <p className="mt-8 max-w-lg border-l border-gold-400/50 pl-5 font-display text-lg leading-relaxed text-paper/85 italic">
              {sermon.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col justify-end gap-5">
          {sermon.audioFiles.length > 0 ? (
            <>
              <AudioPlayer
                key={selected?.id}
                src={selected?.url ?? null}
                title={selected?.name}
                knownDuration={selected?.duration}
                tone="dark"
              />
              {sermon.audioFiles.length > 1 && (
                <ul className="divide-y divide-white/10 border-y border-white/10">
                  {sermon.audioFiles.map((file) => {
                    const active = file.id === selectedId;
                    return (
                      <li key={file.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(file.id)}
                          aria-pressed={active}
                          aria-label={t.detail.select(file.name)}
                          className={cn(
                            "flex w-full items-center justify-between gap-4 py-3 text-left text-sm transition-colors",
                            active ? "text-paper" : "text-paper/60 hover:text-paper",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Headphones
                              aria-hidden="true"
                              className={cn("size-3.5 shrink-0", active ? "text-gold-400" : "opacity-60")}
                              strokeWidth={1.75}
                            />
                            <span className="truncate">{file.name}</span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums">
                            {file.duration !== null ? formatDuration(file.duration) : "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="rounded-lg border border-white/12 p-5 text-sm text-paper/70">
              {t.detail.recordingsEmpty}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href={`/predications/${sermon.id}#ecouter`}
              size="lg"
              variant="inverse"
            >
              <Headphones aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t.home.featured.listen}
            </ButtonLink>
            <ButtonLink
              href={`/predications/${sermon.id}`}
              size="lg"
              variant="ghostInverse"
            >
              {t.home.featured.details}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
