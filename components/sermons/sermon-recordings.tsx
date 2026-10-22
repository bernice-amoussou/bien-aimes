"use client";

import { AudioLines, Download, Lock, Play } from "lucide-react";
import { useState } from "react";
import { AudioPlayer } from "@/components/audio/audio-player";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatDuration, formatFileSize } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { AudioFile } from "@/types/sermon";

/** Lecteur + liste de tous les enregistrements d'une prédication. */
export function SermonRecordings({ files }: { files: AudioFile[] }) {
  const { t, locale } = useI18n();
  const [selectedId, setSelectedId] = useState(files[0]?.id ?? null);
  const selected = files.find((file) => file.id === selectedId) ?? null;

  if (files.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong px-5 py-8 text-center text-sm text-ink-muted">
        {t.detail.recordingsEmpty}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <AudioPlayer
        key={selected?.id}
        src={selected?.url ?? null}
        title={selected?.name}
        knownDuration={selected?.duration}
      />

      <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
        {files.map((file, index) => {
          const active = file.id === selectedId;
          const meta = [
            file.format.toUpperCase(),
            file.duration !== null ? formatDuration(file.duration) : t.sermon.durationUnknown,
            file.size !== null ? formatFileSize(file.size, locale) : null,
          ].filter(Boolean);

          return (
            <li
              key={file.id}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-5",
                active && "bg-forest-50/60",
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedId(file.id)}
                aria-pressed={active}
                aria-label={t.detail.select(file.name)}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                    active
                      ? "border-forest-700 bg-forest-700 text-paper"
                      : "border-line-strong text-ink-muted",
                  )}
                >
                  {active ? (
                    <AudioLines aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  ) : (
                    <Play aria-hidden="true" className="ml-0.5 size-3.5" fill="currentColor" strokeWidth={0} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="text-xs text-ink-muted tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-[15px] font-medium text-ink">{file.name}</span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-ink-muted">
                    {active && <span className="mr-2 text-forest-700">{t.detail.nowPlaying} ·</span>}
                    {meta.join(" · ")}
                  </span>
                </span>
              </button>

              <div className="ml-13 shrink-0 sm:ml-0">
                {file.downloadable ? (
                  file.downloadUrl ? (
                    <a
                      href={file.downloadUrl}
                      download
                      className={buttonStyles({ variant: "secondary", size: "sm" })}
                    >
                      <Download aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                      {t.detail.download}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={t.player.unavailableTitle}
                      className={buttonStyles({ variant: "secondary", size: "sm" })}
                    >
                      <Download aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                      {t.detail.download}
                    </button>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                    <Lock aria-hidden="true" className="size-3" strokeWidth={1.75} />
                    {t.detail.downloadUnavailable}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
