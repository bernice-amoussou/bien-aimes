"use client";

import { CircleAlert, Pause, Play, RotateCcw, RotateCw, VolumeX } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";

type Tone = "light" | "dark";

interface AudioPlayerProps {
  /** URL lisible (http(s) ou blob:). `null` affiche un état « non disponible ». */
  src: string | null;
  /** Titre affiché au-dessus de la piste. */
  title?: string;
  /** Durée connue en secondes, utilisée tant que le navigateur ne l'a pas déterminée. */
  knownDuration?: number | null;
  tone?: Tone;
  className?: string;
}

/**
 * Lecteur audio basé sur l'élément HTML `<audio>`.
 * Pour changer de piste, donnez au composant une `key` différente :
 * son état (position, erreur…) est alors réinitialisé proprement.
 */
export function AudioPlayer({
  src,
  title,
  knownDuration = null,
  tone = "light",
  className,
}: AudioPlayerProps) {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [current, setCurrent] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  // Certains fichiers (WebM issus de MediaRecorder) annoncent une durée infinie.
  const duration = mediaDuration ?? knownDuration ?? 0;
  const unavailable = !src;
  const disabled = unavailable || failed;
  const progress = duration > 0 ? Math.min((current / duration) * 100, 100) : 0;
  const dark = tone === "dark";

  function toggle() {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    if (audio.paused) {
      audio.play().catch(() => setFailed(true));
    } else {
      audio.pause();
    }
  }

  function seekTo(seconds: number) {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    const upper = duration > 0 ? duration : Number.isFinite(audio.duration) ? audio.duration : seconds;
    audio.currentTime = Math.max(0, Math.min(seconds, upper));
    setCurrent(audio.currentTime);
  }

  const rangeStyle = {
    "--range-progress": `${progress}%`,
    ...(dark && {
      "--range-fill": "var(--color-gold-400)",
      "--range-rest": "rgb(250 248 243 / 0.22)",
      "--range-thumb": "var(--color-paper)",
    }),
  } as CSSProperties;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 sm:p-5",
        dark ? "border-white/12 bg-white/[0.06]" : "border-line bg-surface",
        className,
      )}
    >
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setMediaDuration(d);
          }}
          onDurationChange={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setMediaDuration(d);
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onPlaying={() => setBuffering(false)}
          onError={() => {
            setFailed(true);
            setPlaying(false);
          }}
        />
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-label={playing ? t.player.pause : t.player.play}
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full transition-colors",
            "disabled:cursor-not-allowed",
            dark
              ? "bg-paper text-forest-800 hover:bg-sand-100 disabled:bg-white/15 disabled:text-paper/50"
              : "bg-forest-700 text-paper hover:bg-forest-800 disabled:bg-paper-deep disabled:text-ink-muted",
          )}
        >
          {disabled ? (
            <VolumeX aria-hidden="true" className="size-5" strokeWidth={1.75} />
          ) : playing ? (
            <Pause aria-hidden="true" className="size-5" fill="currentColor" strokeWidth={0} />
          ) : (
            <Play aria-hidden="true" className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p
              className={cn(
                "line-clamp-2 text-sm font-medium",
                dark ? "text-paper" : "text-ink",
              )}
            >
              {title ?? t.player.unavailableTitle}
            </p>
            <p
              className={cn(
                "shrink-0 text-xs tabular-nums",
                dark ? "text-paper/70" : "text-ink-muted",
              )}
              aria-live="off"
            >
              {buffering
                ? t.player.loading
                : disabled
                  ? duration > 0 && formatClock(duration)
                  : `${formatClock(current)} / ${duration > 0 ? formatClock(duration) : "--:--"}`}
            </p>
          </div>
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 0}
            step={1}
            value={Math.min(current, duration || 0)}
            disabled={disabled || duration === 0}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label={t.player.seek}
            aria-valuetext={`${formatClock(current)} / ${formatClock(duration)}`}
            className="range-track block h-4 w-full"
            style={rangeStyle}
          />
        </div>

        <div className={cn("hidden items-center gap-1", !disabled && "sm:flex")}>
          {[
            { label: t.player.rewind, icon: RotateCcw, delta: -15 },
            { label: t.player.forward, icon: RotateCw, delta: 30 },
          ].map(({ label, icon: Icon, delta }) => (
            <button
              key={delta}
              type="button"
              onClick={() => seekTo(current + delta)}
              disabled={disabled}
              aria-label={label}
              title={label}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-md transition-colors disabled:opacity-40",
                dark ? "text-paper/80 hover:bg-white/10" : "text-ink-muted hover:bg-paper-deep hover:text-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.5} />
              <span aria-hidden="true" className="absolute text-[7px] font-semibold">
                {Math.abs(delta)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {(unavailable || failed) && (
        <p
          role={failed ? "alert" : undefined}
          className={cn(
            "mt-3 flex items-start gap-2 pl-16 text-[13px] leading-relaxed",
            dark ? "text-paper/60" : "text-ink-muted",
          )}
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
          <span>
            {!failed && <span className={dark ? "text-paper/85" : "text-ink-soft"}>{t.player.unavailableTitle}. </span>}
            {failed ? t.player.error : t.player.unavailableText}
          </span>
        </p>
      )}
    </div>
  );
}
