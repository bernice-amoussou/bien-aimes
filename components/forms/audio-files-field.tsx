"use client";

import { Archive, FileAudio, Headphones, Mic, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { AudioPlayer } from "@/components/audio/audio-player";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import { Alert } from "@/components/ui/alert";
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

/** Petits boutons empilés (icône + libellé) : tiennent à trois par ligne dès 320 px. */
const fileActionClass =
  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-line-strong bg-surface px-1 py-2 text-[13px] font-medium transition-colors";

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

function ChoiceButton({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: typeof Mic;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 w-full items-center gap-4 rounded-3xl border border-line-strong bg-surface px-5 py-4 text-left transition-colors hover:border-forest-500 hover:bg-forest-50/50 active:bg-forest-50"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-forest-700 text-paper">
        <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-[17px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span>
      </span>
    </button>
  );
}

export function AudioFilesField({ files, setFiles, onRecorderStatusChange }: Props) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const recordingCount = useRef(0);

  function toDrafts(list: FileList | File[]) {
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
    return accepted;
  }

  // La durée est lue en arrière-plan à partir des métadonnées du fichier.
  function probeDurations(drafts: AudioDraft[]) {
    for (const draft of drafts) {
      void probeAudioDuration(draft.url as string).then((duration) => {
        if (duration === null) return;
        setFiles((current) => current.map((f) => (f.id === draft.id ? { ...f, duration } : f)));
      });
    }
  }

  function addFiles(list: FileList | File[]) {
    const accepted = toDrafts(list);
    if (accepted.length === 0) return;
    setFiles((current) => [...current, ...accepted]);
    probeDurations(accepted);
  }

  /** Remplace un fichier par un autre, à la même position (l'ancien est retiré à l'enregistrement). */
  function replaceFile(targetId: string, list: FileList) {
    const [replacement] = toDrafts([list[0]]);
    if (!replacement) return;
    setFiles((current) =>
      current.map((f) => {
        if (f.id !== targetId) return f;
        if (f.url && f.source !== "existing") URL.revokeObjectURL(f.url);
        return replacement;
      }),
    );
    if (previewId === targetId) setPreviewId(null);
    probeDurations([replacement]);
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
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        "-m-2 space-y-5 rounded-3xl p-2 transition-colors",
        dragging && "bg-forest-50 ring-2 ring-forest-500 ring-dashed",
      )}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {recorderOpen ? (
          <AudioRecorder
            onRecordingComplete={handleRecording}
            onStatusChange={onRecorderStatusChange}
            onClose={() => setRecorderOpen(false)}
            className="lg:col-span-2"
          />
        ) : (
          <ChoiceButton
            icon={Mic}
            title={t.upload.record}
            hint={t.upload.recordHint}
            onClick={() => setRecorderOpen(true)}
          />
        )}
        <ChoiceButton
          icon={Upload}
          title={t.upload.choose}
          hint={t.upload.chooseHint(MAX_AUDIO_FILE_MB)}
          onClick={() => inputRef.current?.click()}
        />
      </div>
      <p className="hidden text-center text-sm text-ink-muted lg:block">{t.upload.dropHint}</p>

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
      <input
        ref={replaceRef}
        type="file"
        accept={AUDIO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files?.length && replaceTarget.current) replaceFile(replaceTarget.current, e.target.files);
          replaceTarget.current = null;
          e.target.value = "";
        }}
      />

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

      {files.length > 0 && (
        <section aria-labelledby="audio-list-title">
          <h3 id="audio-list-title" className="mb-2 text-[17px] font-semibold text-ink" aria-live="polite">
            {t.upload.listTitle(files.length)}
          </h3>
          <ul className="space-y-3">
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
                draft.duration !== null ? formatClock(draft.duration) : null,
                draft.size !== null ? formatFileSize(draft.size, locale) : null,
              ].filter(Boolean);

              return (
                <li key={draft.id} className="rounded-3xl bg-paper-deep/70 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-forest-700">
                      <SourceIcon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`name-${draft.id}`} className="sr-only">
                        {t.upload.rename(draft.name)}
                      </label>
                      <input
                        id={`name-${draft.id}`}
                        value={draft.name}
                        onChange={(e) =>
                          setFiles((current) =>
                            current.map((f) => (f.id === draft.id ? { ...f, name: e.target.value } : f)),
                          )
                        }
                        className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] font-medium text-ink focus:border-forest-500 focus:ring-3 focus:ring-forest-500/15 focus:outline-none"
                      />
                      <p className="mt-1 truncate text-[13px] text-ink-muted">{meta.join(" · ")}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewId(previewing ? null : draft.id)}
                      aria-expanded={previewing}
                      className={cn(fileActionClass, "text-ink hover:bg-paper")}
                    >
                      <Headphones aria-hidden="true" className="size-4" strokeWidth={1.75} />
                      {previewing ? t.upload.hide : t.upload.listen}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        replaceTarget.current = draft.id;
                        replaceRef.current?.click();
                      }}
                      aria-label={t.upload.replaceLabel(draft.name)}
                      className={cn(fileActionClass, "text-ink hover:bg-paper")}
                    >
                      <RefreshCw aria-hidden="true" className="size-4" strokeWidth={1.75} />
                      {t.upload.replace}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(draft)}
                      aria-label={t.upload.remove(draft.name)}
                      className={cn(fileActionClass, "text-danger-700 hover:border-danger-600/40 hover:bg-danger-50")}
                    >
                      <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
                      {t.upload.delete}
                    </button>
                  </div>
                  {previewing && (
                    <AudioPlayer src={draft.url} title={draft.name} knownDuration={draft.duration} className="mt-3" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
