"use client";

import { Archive, FileAudio, Headphones, Mic, Trash2, Upload } from "lucide-react";
import { useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { AudioPlayer } from "@/components/audio/audio-player";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import { Alert } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import {
  AUDIO_ACCEPT,
  MAX_AUDIO_FILE_MB,
  MAX_AUDIO_FILE_SIZE,
  audioFormatOf,
  isAudioFile,
  probeAudioDuration,
  stripExtension,
} from "@/lib/audio/audio-files";
import { extensionForMimeType } from "@/lib/audio/recorder";
import type { RecorderStatus, RecordingResult } from "@/lib/audio/use-audio-recorder";
import { cn } from "@/lib/cn";
import { formatClock, formatFileSize } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { AudioDraft } from "@/types/audio-draft";

export type { AudioDraft };

let draftCounter = 0;
function nextDraftId() {
  draftCounter += 1;
  return `draft-${draftCounter}`;
}

interface Props {
  files: AudioDraft[];
  setFiles: Dispatch<SetStateAction<AudioDraft[]>>;
  onRecorderStatusChange?: (status: RecorderStatus) => void;
}

export function AudioFilesField({ files, setFiles, onRecorderStatusChange }: Props) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const recordingCount = useRef(0);

  function addFiles(list: FileList | File[]) {
    const accepted: AudioDraft[] = [];
    const errors: string[] = [];
    for (const file of Array.from(list)) {
      if (!isAudioFile(file)) errors.push(t.upload.invalidType(file.name));
      else if (file.size > MAX_AUDIO_FILE_SIZE) errors.push(t.upload.tooLarge(file.name, MAX_AUDIO_FILE_MB));
      else {
        accepted.push({
          id: nextDraftId(),
          name: stripExtension(file.name),
          url: URL.createObjectURL(file),
          duration: null,
          format: audioFormatOf(file),
          size: file.size,
          downloadable: true,
          source: "import",
          file,
        });
      }
    }
    setRejected(errors);
    if (accepted.length === 0) return;
    setFiles((current) => [...current, ...accepted]);
    // La durée est lue en arrière-plan à partir des métadonnées du fichier.
    for (const draft of accepted) {
      void probeAudioDuration(draft.url as string).then((duration) => {
        if (duration === null) return;
        setFiles((current) => current.map((f) => (f.id === draft.id ? { ...f, duration } : f)));
      });
    }
  }

  function handleRecording({ file, duration, mimeType }: RecordingResult) {
    recordingCount.current += 1;
    setFiles((current) => [
      ...current,
      {
        id: nextDraftId(),
        name: t.recorder.defaultName(recordingCount.current),
        url: URL.createObjectURL(file),
        duration,
        format: extensionForMimeType(mimeType),
        size: file.size,
        downloadable: true,
        source: "recording",
        file,
      },
    ]);
  }

  function removeFile(draft: AudioDraft) {
    if (draft.url && draft.source !== "existing") URL.revokeObjectURL(draft.url);
    if (previewId === draft.id) setPreviewId(null);
    setFiles((current) => current.filter((f) => f.id !== draft.id));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
            dragging ? "border-forest-500 bg-forest-50" : "border-line-strong bg-paper",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface text-forest-700">
            <Upload aria-hidden="true" className="size-5" strokeWidth={1.5} />
          </span>
          <p className="mt-4 text-sm font-medium text-ink">{t.upload.dropTitle}</p>
          <p className="mt-1 text-[13px] text-ink-muted">{t.upload.dropHint(MAX_AUDIO_FILE_MB)}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
            {t.upload.browse}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={AUDIO_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = ""; // permet de resélectionner le même fichier
            }}
          />
        </div>

        <AudioRecorder onRecordingComplete={handleRecording} onStatusChange={onRecorderStatusChange} />
      </div>

      <div aria-live="polite">
        {rejected.length > 0 && (
          <Alert tone="error">
            <ul className="space-y-0.5">
              {rejected.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink" aria-live="polite">
          {t.upload.listTitle(files.length)}
        </h3>
        {files.length === 0 ? (
          <p className="rounded-lg border border-line bg-paper px-5 py-6 text-center text-[13px] text-ink-muted">
            {t.upload.listEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {files.map((draft) => {
              const previewing = previewId === draft.id;
              const SourceIcon =
                draft.source === "recording" ? Mic : draft.source === "existing" ? Archive : FileAudio;
              const sourceLabel =
                draft.source === "recording"
                  ? t.upload.sourceRecording
                  : draft.source === "existing"
                    ? t.upload.existing
                    : t.upload.sourceImport;
              const meta = [
                sourceLabel,
                draft.format.toUpperCase(),
                draft.duration !== null ? formatClock(draft.duration) : null,
                draft.size !== null ? formatFileSize(draft.size, locale) : null,
              ].filter(Boolean);

              return (
                <li key={draft.id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-3">
                    <SourceIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          setFiles((current) =>
                            current.map((f) => (f.id === draft.id ? { ...f, name: e.target.value } : f)),
                          )
                        }
                        aria-label={t.upload.rename(draft.name)}
                        className="-mx-1.5 w-full truncate rounded-sm border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-ink hover:border-line focus:border-forest-500 focus:outline-none"
                      />
                      <p className="truncate text-xs text-ink-muted">{meta.join(" · ")}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewId(previewing ? null : draft.id)}
                      aria-expanded={previewing}
                    >
                      <Headphones aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                      <span className="hidden sm:inline">{previewing ? t.upload.hide : t.upload.listen}</span>
                    </Button>
                    <IconButton
                      label={t.upload.remove(draft.name)}
                      onClick={() => removeFile(draft)}
                      className="hover:bg-danger-50 hover:text-danger-600"
                    >
                      <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    </IconButton>
                  </div>
                  {previewing && (
                    <AudioPlayer
                      src={draft.url}
                      title={draft.name}
                      knownDuration={draft.duration}
                      className="mt-3"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
