"use client";

import { LoaderCircle, Mic, Pause, Play, Square, X } from "lucide-react";
import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useAudioRecorder, type RecorderStatus, type RecordingResult } from "@/lib/audio/use-audio-recorder";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";

interface AudioRecorderProps {
  onRecordingComplete: (result: RecordingResult) => void;
  /** Permet au parent de savoir si une capture est en cours (ex. bloquer l'envoi d'un formulaire). */
  onStatusChange?: (status: RecorderStatus) => void;
  /** Ferme le panneau (proposé uniquement hors capture). */
  onClose?: () => void;
  className?: string;
}

export function AudioRecorder({ onRecordingComplete, onStatusChange, onClose, className }: AudioRecorderProps) {
  const { t } = useI18n();
  const recorder = useAudioRecorder(onRecordingComplete);
  const { status, error, supported } = recorder;

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const busy = status === "recording" || status === "paused";
  // Plus de 2 s de capture sans le moindre son : on prévient tout de suite.
  const noSignal =
    status === "recording" && recorder.canMeasure && !recorder.heardSound && recorder.elapsedSeconds > 2;
  // Jauge non linéaire : la voix (RMS ≈ 0,02 à 0,2) occupe l'essentiel de la largeur.
  const meter = Math.min(1, Math.sqrt(recorder.level) * 2.2);

  return (
    <section
      aria-labelledby="recorder-title"
      className={cn("rounded-3xl border border-line bg-surface p-5", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id="recorder-title" className="flex items-center gap-2 text-[17px] font-semibold text-ink">
          <Mic aria-hidden="true" className="size-5 text-forest-700" strokeWidth={1.75} />
          {t.recorder.title}
        </h3>
        {onClose && !busy && status !== "requesting" && (
          <IconButton label={t.recorder.close} onClick={onClose} className="-mr-2">
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </IconButton>
        )}
      </div>

      <div className="mt-5 text-center">
        <p
          role="timer"
          aria-label={t.recorder.duration}
          aria-live="off"
          className={cn(
            "text-[3.25rem] leading-none font-light tracking-tight tabular-nums",
            status === "recording" ? "text-ink" : "text-ink-muted",
          )}
        >
          {formatClock(recorder.elapsedSeconds).padStart(5, "0")}
        </p>
        <p className="mt-2 inline-flex items-center gap-2 text-[15px] text-ink-soft" aria-live="polite">
          {status === "recording" && (
            <span aria-hidden="true" className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger-600 opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-danger-600" />
            </span>
          )}
          {t.recorder.states[status]}
        </p>

        {busy && recorder.canMeasure && (
          <div className="mx-auto mt-4 max-w-xs">
            <div
              role="meter"
              aria-label={t.recorder.level}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(meter * 100)}
              className="h-2 overflow-hidden rounded-full bg-paper-deep"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-100",
                  noSignal ? "bg-danger-600" : "bg-forest-500",
                )}
                style={{ width: `${status === "paused" ? 0 : Math.max(meter * 100, 2)}%` }}
              />
            </div>
            {noSignal && <p className="mt-2 text-sm text-danger-700">{t.recorder.noSignal}</p>}
          </div>
        )}
      </div>

      <div className="mt-6">
        {!busy ? (
          <Button
            size="xl"
            variant="danger"
            onClick={recorder.start}
            disabled={!supported || status === "requesting"}
            className="w-full"
          >
            {status === "requesting" ? (
              <LoaderCircle aria-hidden="true" className="size-5 animate-spin" strokeWidth={2} />
            ) : (
              <span aria-hidden="true" className="size-3.5 rounded-full bg-white" />
            )}
            {status === "stopped" ? t.recorder.newRecording : t.recorder.start}
          </Button>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {status === "recording" ? (
              <Button size="xl" variant="secondary" onClick={recorder.pause}>
                <Pause aria-hidden="true" className="size-5" strokeWidth={1.75} />
                {t.recorder.pause}
              </Button>
            ) : (
              <Button size="xl" variant="secondary" onClick={recorder.resume}>
                <Play aria-hidden="true" className="size-5" strokeWidth={1.75} />
                {t.recorder.resume}
              </Button>
            )}
            <Button size="xl" onClick={recorder.stop}>
              <Square aria-hidden="true" className="size-4" fill="currentColor" strokeWidth={0} />
              {t.recorder.stop}
            </Button>
          </div>
        )}
      </div>

      {!busy && recorder.devices.length > 1 && (
        <div className="mt-4">
          <label htmlFor="recorder-device" className="mb-1 block text-sm font-medium text-ink-muted">
            {t.recorder.microphone}
          </label>
          <Select
            id="recorder-device"
            value={recorder.deviceId}
            onChange={(e) => recorder.setDeviceId(e.target.value)}
            disabled={status === "requesting"}
          >
            <option value="">{t.recorder.defaultMicrophone}</option>
            {recorder.devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div aria-live="polite" className="empty:hidden">
        {recorder.blockReason === "insecure" && (
          <Alert tone="error" title={t.recorder.insecureTitle} className="mt-4">
            {t.recorder.insecureText}
          </Alert>
        )}
        {recorder.blockReason === "unsupported" && (
          <Alert tone="error" className="mt-4">
            {t.recorder.errors.unsupported}
          </Alert>
        )}
        {supported && error && (
          <Alert tone="error" className="mt-4">
            {t.recorder.errors[error]}
          </Alert>
        )}
        {status === "stopped" && !error && recorder.silent && (
          <Alert tone="error" title={t.recorder.silentTitle} className="mt-4">
            {t.recorder.silentText}
          </Alert>
        )}
        {status === "stopped" && !error && !recorder.silent && (
          <Alert tone="success" className="mt-4">
            {t.recorder.added}
          </Alert>
        )}
      </div>
    </section>
  );
}
