"use client";

import { Circle, Mic, Pause, Play, Square } from "lucide-react";
import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useAudioRecorder, type RecorderStatus, type RecordingResult } from "@/lib/audio/use-audio-recorder";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";

interface AudioRecorderProps {
  onRecordingComplete: (result: RecordingResult) => void;
  /** Permet au parent de savoir si une capture est en cours (ex. bloquer l'envoi d'un formulaire). */
  onStatusChange?: (status: RecorderStatus) => void;
  className?: string;
}

const STATUS_STYLES: Record<RecorderStatus, string> = {
  idle: "bg-paper-deep text-ink-muted",
  requesting: "bg-sand-100 text-gold-700",
  recording: "bg-danger-50 text-danger-700",
  paused: "bg-sand-100 text-gold-700",
  stopped: "bg-forest-50 text-forest-700",
};

export function AudioRecorder({ onRecordingComplete, onStatusChange, className }: AudioRecorderProps) {
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
      className={cn("flex flex-col rounded-lg border border-line bg-surface p-5", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="recorder-title" className="flex items-center gap-2 text-sm font-medium text-ink">
          <Mic aria-hidden="true" className="size-4 text-forest-700" strokeWidth={1.75} />
          {t.recorder.title}
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium",
            STATUS_STYLES[status],
          )}
        >
          {status === "recording" ? (
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger-600 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-danger-600" />
            </span>
          ) : (
            <Circle aria-hidden="true" className="size-2" fill="currentColor" strokeWidth={0} />
          )}
          {t.recorder.states[status]}
        </span>
      </div>

      <div className="mt-6 flex flex-1 flex-col justify-between gap-6">
        <div>
          <p className="sr-only" id="recorder-duration-label">
            {t.recorder.duration}
          </p>
          <p
            aria-labelledby="recorder-duration-label"
            role="timer"
            aria-live="off"
            className={cn(
              "text-[2.75rem] leading-none font-extralight tracking-tight tabular-nums",
              status === "recording" ? "text-ink" : "text-ink-muted",
            )}
          >
            {formatClock(recorder.elapsedSeconds).padStart(5, "0")}
          </p>
          {recorder.mimeType && (
            <p className="mt-1 text-xs text-ink-muted">{t.recorder.format(recorder.mimeType)}</p>
          )}

          {busy && recorder.canMeasure && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-ink-muted" id="recorder-level-label">
                {t.recorder.level}
              </p>
              <div
                role="meter"
                aria-labelledby="recorder-level-label"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(meter * 100)}
                className="h-1.5 overflow-hidden rounded-full bg-paper-deep"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-100",
                    noSignal ? "bg-danger-600" : "bg-forest-500",
                  )}
                  style={{ width: `${status === "paused" ? 0 : Math.max(meter * 100, 2)}%` }}
                />
              </div>
              {noSignal && <p className="mt-2 text-xs text-danger-700">{t.recorder.noSignal}</p>}
            </div>
          )}

          {!busy && recorder.devices.length > 1 && (
            <div className="mt-4">
              <label htmlFor="recorder-device" className="mb-1 block text-xs font-medium text-ink-muted">
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
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {!busy && (
            <Button
              onClick={recorder.start}
              disabled={!supported || status === "requesting"}
              variant={status === "stopped" ? "secondary" : "primary"}
            >
              <Mic aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {status === "stopped" ? t.recorder.newRecording : t.recorder.start}
            </Button>
          )}
          {status === "recording" && (
            <Button variant="secondary" onClick={recorder.pause}>
              <Pause aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t.recorder.pause}
            </Button>
          )}
          {status === "paused" && (
            <Button variant="secondary" onClick={recorder.resume}>
              <Play aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t.recorder.resume}
            </Button>
          )}
          {busy && (
            <Button variant="danger" onClick={recorder.stop}>
              <Square aria-hidden="true" className="size-3.5" fill="currentColor" strokeWidth={0} />
              {t.recorder.stop}
            </Button>
          )}
        </div>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {recorder.blockReason === "insecure" && (
          <Alert tone="error" title={t.recorder.insecureTitle} className="mt-4">
            {t.recorder.insecureText(window.location.origin, `http://localhost:${window.location.port || "3000"}`)}
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
