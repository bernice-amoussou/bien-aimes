"use client";

import {
  AudioLines,
  CircleAlert,
  Download,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatClock, formatDuration, formatFileSize } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { Sermon } from "@/types/sermon";
import { tracksOf, usePlayer, usePlayerApi, type Track } from "./player-provider";

function SeekBar({
  current,
  duration,
  onSeek,
  disabled,
  dark,
  className,
}: {
  current: number;
  duration: number;
  onSeek: (seconds: number) => void;
  disabled?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const progress = duration > 0 ? Math.min((current / duration) * 100, 100) : 0;
  const style = {
    "--range-progress": `${progress}%`,
    ...(dark && {
      "--range-fill": "var(--color-gold-400)",
      "--range-rest": "rgb(250 248 243 / 0.22)",
      "--range-thumb": "var(--color-paper)",
    }),
  } as CSSProperties;

  return (
    <input
      type="range"
      min={0}
      max={duration > 0 ? duration : 0}
      step={1}
      value={Math.min(current, duration || 0)}
      disabled={disabled || duration === 0}
      onChange={(e) => onSeek(Number(e.target.value))}
      aria-label={t.player.seek}
      aria-valuetext={`${formatClock(current)} / ${formatClock(duration)}`}
      className={cn("range-track block h-8 w-full", className)}
      style={style}
    />
  );
}

function SkipButton({
  delta,
  onSkip,
  disabled,
  className,
  size = "md",
}: {
  delta: number;
  onSkip: (delta: number) => void;
  disabled?: boolean;
  className?: string;
  size?: "md" | "lg";
}) {
  const { t } = useI18n();
  const Icon = delta < 0 ? RotateCcw : RotateCw;
  const label = delta < 0 ? t.player.rewind : t.player.forward;
  return (
    <button
      type="button"
      onClick={() => onSkip(delta)}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
        size === "lg" ? "size-14" : "size-11",
        className,
      )}
    >
      <Icon aria-hidden="true" className={size === "lg" ? "size-7" : "size-5"} strokeWidth={1.5} />
      <span aria-hidden="true" className={cn("absolute font-semibold", size === "lg" ? "text-[9px]" : "text-[7px]")}>
        {Math.abs(delta)}
      </span>
    </button>
  );
}

/** Bouton rond de lecture d'une prédication (première partie), utilisé dans les listes. */
export function PlayButton({ sermon, className }: { sermon: Sermon; className?: string }) {
  const { t } = useI18n();
  const { track, playing, buffering } = usePlayer();
  const { toggle } = usePlayerApi();
  const first = tracksOf(sermon)[0];

  if (!first) {
    return (
      <span
        className={cn(
          "relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-paper-deep text-ink-muted",
          className,
        )}
        title={t.sermon.noAudio}
      >
        <VolumeX aria-hidden="true" className="size-5" strokeWidth={1.75} />
        <span className="sr-only">{t.sermon.noAudio}</span>
      </span>
    );
  }

  const isCurrent = track?.sermonId === sermon.id;
  const active = isCurrent && playing;

  return (
    <button
      type="button"
      onClick={() => (isCurrent ? toggle() : toggle(first))}
      aria-label={active ? t.sermon.pause(sermon.title) : t.sermon.play(sermon.title)}
      className={cn(
        "relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full transition-colors",
        isCurrent
          ? "bg-gold-500 text-white hover:bg-gold-700"
          : "bg-forest-700 text-paper hover:bg-forest-800 active:bg-forest-900",
        className,
      )}
    >
      {isCurrent && buffering ? (
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" strokeWidth={2} />
      ) : active ? (
        <Pause aria-hidden="true" className="size-5" fill="currentColor" strokeWidth={0} />
      ) : (
        <Play aria-hidden="true" className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
      )}
    </button>
  );
}

/**
 * Mini-lecteur fixé en bas de l'écran (au-dessus de la barre d'onglets sur mobile) :
 * il reste visible et contrôlable sur toutes les pages tant qu'une écoute est en cours.
 */
export function MiniPlayer() {
  const { t } = useI18n();
  const { track, playing, buffering, current, duration, failed } = usePlayer();
  const { toggle, skip, close } = usePlayerApi();
  if (!track) return null;

  const progress = duration > 0 ? Math.min((current / duration) * 100, 100) : 0;
  const status = failed
    ? t.player.errorShort
    : buffering
      ? t.player.loading
      : `${formatClock(current)} / ${duration > 0 ? formatClock(duration) : "--:--"}`;

  return (
    <>
      <div aria-hidden="true" className="h-20 md:h-24" />
      <section
        aria-label={t.player.label}
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-2 pb-2 md:bottom-0 md:px-4 md:pb-4"
      >
        <div className="relative mx-auto flex max-w-3xl items-center gap-2 overflow-hidden rounded-2xl bg-forest-800 p-2 text-paper shadow-lift sm:gap-3">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-white/10">
            <div className="h-full bg-gold-400" style={{ width: `${progress}%` }} />
          </div>

          <button
            type="button"
            onClick={() => toggle()}
            disabled={failed}
            aria-label={playing ? t.player.pause : t.player.play}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-paper text-forest-800 transition-colors hover:bg-sand-100 disabled:opacity-50"
          >
            {buffering ? (
              <LoaderCircle aria-hidden="true" className="size-5 animate-spin" strokeWidth={2} />
            ) : playing ? (
              <Pause aria-hidden="true" className="size-5" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play aria-hidden="true" className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
            )}
          </button>

          <Link
            href={`/predications/${track.sermonId}`}
            aria-label={t.player.open(track.title)}
            className="min-w-0 flex-1 rounded-md py-1"
          >
            <span className="block truncate text-[15px] leading-tight font-medium">{track.title}</span>
            <span className="mt-0.5 block truncate text-[13px] text-paper/70 tabular-nums">
              {status}
              {track.part && ` · ${track.part}`}
            </span>
          </Link>

          <div className="hidden items-center sm:flex">
            <SkipButton delta={-15} onSkip={skip} disabled={failed} className="text-paper/85 hover:bg-white/10" />
            <SkipButton delta={30} onSkip={skip} disabled={failed} className="text-paper/85 hover:bg-white/10" />
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t.player.close}
            title={t.player.close}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-paper/75 transition-colors hover:bg-white/10 hover:text-paper"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </section>
    </>
  );
}

/** Grand lecteur de la page d'une prédication, relié au lecteur global. */
export function SermonPlayer({ sermon }: { sermon: Sermon }) {
  const { t, locale } = useI18n();
  const state = usePlayer();
  const { toggle, seek, skip } = usePlayerApi();
  const tracks = tracksOf(sermon);
  const files = sermon.audioFiles;

  if (files.length === 0) {
    return (
      <p className="rounded-3xl bg-paper-deep px-5 py-8 text-center text-[15px] text-ink-muted">
        {t.detail.recordingsEmpty}
      </p>
    );
  }

  const liveTrack = state.track?.sermonId === sermon.id ? state.track : null;
  const selected: Track | null = liveTrack ?? tracks[0] ?? null;
  const live = liveTrack !== null;
  const playing = live && state.playing;
  const current = live ? state.current : 0;
  const duration = live ? state.duration : (selected?.knownDuration ?? 0);
  const failed = live && state.failed;
  const singleFile = files.length === 1 ? files[0] : null;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-forest-800 px-5 pt-5 pb-6 text-paper sm:px-8 sm:pt-7">
        {selected ? (
          <>
            {selected.part && (
              <p className="truncate text-center text-sm text-paper/70">
                {live && <span className="text-gold-400">{t.player.nowPlaying} · </span>}
                {selected.part}
              </p>
            )}
            <div className="mt-2 flex items-center justify-center gap-6 sm:gap-10">
              <SkipButton
                delta={-15}
                size="lg"
                onSkip={skip}
                disabled={!live || failed}
                className="text-paper/85 hover:bg-white/10"
              />
              <button
                type="button"
                onClick={() => toggle(selected)}
                disabled={failed}
                aria-label={playing ? t.player.pause : t.player.play}
                className="flex size-20 shrink-0 items-center justify-center rounded-full bg-paper text-forest-800 shadow-lift transition-colors hover:bg-sand-100 active:bg-sand-200 disabled:opacity-50"
              >
                {live && state.buffering ? (
                  <LoaderCircle aria-hidden="true" className="size-8 animate-spin" strokeWidth={2} />
                ) : playing ? (
                  <Pause aria-hidden="true" className="size-8" fill="currentColor" strokeWidth={0} />
                ) : (
                  <Play aria-hidden="true" className="ml-1 size-8" fill="currentColor" strokeWidth={0} />
                )}
              </button>
              <SkipButton
                delta={30}
                size="lg"
                onSkip={skip}
                disabled={!live || failed}
                className="text-paper/85 hover:bg-white/10"
              />
            </div>
            <SeekBar
              current={current}
              duration={duration}
              onSeek={seek}
              disabled={!live || failed}
              dark
              className="mt-5"
            />
            <div className="flex justify-between text-[13px] text-paper/70 tabular-nums">
              <span>{formatClock(current)}</span>
              <span>{duration > 0 ? formatClock(duration) : "--:--"}</span>
            </div>
            {failed && (
              <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-paper/85">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                {t.player.error}
              </p>
            )}
          </>
        ) : (
          <p className="flex items-start gap-2 py-4 text-[15px] text-paper/80">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
            {t.player.unavailableText}
          </p>
        )}
      </div>

      {singleFile?.downloadable && singleFile.downloadUrl && (
        <a
          href={singleFile.downloadUrl}
          download
          className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full sm:w-auto" })}
        >
          <Download aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t.detail.download}
          {singleFile.size !== null && (
            <span className="font-normal text-ink-muted">({formatFileSize(singleFile.size, locale)})</span>
          )}
        </a>
      )}

      {files.length > 1 && (
        <section aria-labelledby="parts-title">
          <h2 id="parts-title" className="mt-2 mb-2 text-sm font-medium text-ink-muted">
            {t.detail.parts(files.length)}
          </h2>
          <ol className="space-y-2">
            {files.map((file) => {
              const fileTrack = tracks.find((tr) => tr.id === file.id);
              const isSelected = selected?.id === file.id;
              return (
                <li key={file.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!fileTrack}
                    onClick={() => fileTrack && toggle(fileTrack)}
                    aria-label={t.detail.select(file.name)}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 text-left transition-colors disabled:opacity-50",
                      isSelected ? "bg-forest-50 text-forest-900" : "bg-surface hover:bg-paper-deep",
                    )}
                  >
                    {isSelected && playing ? (
                      <AudioLines aria-hidden="true" className="size-5 shrink-0 text-forest-700" strokeWidth={1.75} />
                    ) : (
                      <Play aria-hidden="true" className="size-5 shrink-0 text-forest-700" fill="currentColor" strokeWidth={0} />
                    )}
                    <span className="line-clamp-2 min-w-0 flex-1 py-2 text-[15px] leading-snug font-medium">{file.name}</span>
                    <span className="shrink-0 text-[13px] text-ink-muted tabular-nums">
                      {file.duration !== null ? formatDuration(file.duration) : ""}
                    </span>
                  </button>
                  {file.downloadable && file.downloadUrl && (
                    <a
                      href={file.downloadUrl}
                      download
                      aria-label={t.detail.downloadFile(file.name)}
                      title={t.detail.download}
                      className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                    >
                      <Download aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
