"use client";

import { ArrowLeft, BookOpen, CircleAlert, LoaderCircle, Mic, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";
import type { SaveError, SaveProgress, SaveResult } from "@/lib/admin/save-sermon";
import type { RecorderStatus } from "@/lib/audio/use-audio-recorder";
import { cn } from "@/lib/cn";
import { formatClock, formatDate, formatFileSize } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { useI18n } from "@/lib/i18n/locale-provider";
import { SERMON_TITLE_MAX, isValidIsoDate } from "@/lib/sermon-utils";
import type { AudioDraft } from "@/types/audio-draft";
import type { AudioFile, SermonDraft, SermonLanguage } from "@/types/sermon";
import { AudioFilesField } from "./audio-files-field";
import { ScriptureReferencesField, type ReferenceRow } from "./scripture-references-field";

type ErrorKey = keyof Dictionary["form"]["errors"];

const STEPS = ["details", "references", "audio", "review"] as const;
type Step = (typeof STEPS)[number];
const REVIEW = STEPS.length - 1;

interface FormErrors {
  date?: ErrorKey;
  title?: ErrorKey;
  references?: ErrorKey;
  rowErrors: Record<string, ErrorKey>;
  recording?: ErrorKey;
}

interface Values {
  date: string;
  title: string;
  rows: ReferenceRow[];
}

function validateStep(step: Step, values: Values, recorderBusy: boolean): FormErrors {
  const errors: FormErrors = { rowErrors: {} };
  if (step === "details") {
    if (!values.date) errors.date = "dateRequired";
    else if (!isValidIsoDate(values.date)) errors.date = "dateInvalid";
    const title = values.title.trim();
    if (!title) errors.title = "titleRequired";
    else if (title.length > SERMON_TITLE_MAX) errors.title = "titleTooLong";
  }
  if (step === "references") {
    const filled = values.rows.filter((row) => row.value.trim());
    if (filled.length === 0) errors.references = "referencesRequired";
    else {
      for (const row of values.rows) {
        if (!row.value.trim()) errors.rowErrors[row.id] = "referenceEmpty";
      }
    }
  }
  if (step === "audio" && recorderBusy) errors.recording = "recordingInProgress";
  return errors;
}

function hasErrors(errors: FormErrors) {
  return (
    Boolean(errors.date || errors.title || errors.references || errors.recording) ||
    Object.keys(errors.rowErrors).length > 0
  );
}

/** Date locale au format ISO `YYYY-MM-DD`. */
function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function ReviewBlock({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink-muted">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${editLabel} : ${title}`}
          className="-mr-3 inline-flex h-11 items-center rounded-xl px-3 text-[15px] font-medium text-forest-700 transition-colors hover:bg-forest-50"
        >
          {editLabel}
        </button>
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function UploadProgress({ progress }: { progress: SaveProgress }) {
  const { t, locale } = useI18n();
  const uploading = progress.stage === "uploading" && progress.total > 0;
  const percent =
    progress.stage === "uploading" && progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.loaded / progress.totalBytes) * 100))
      : 0;

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center px-2 py-14 text-center">
      <LoaderCircle aria-hidden="true" className="size-10 animate-spin text-forest-700" strokeWidth={1.75} />
      <h2 className="mt-6 font-display text-[1.75rem] leading-tight text-ink">
        {uploading ? t.form.progress.uploadTitle : t.form.progress.savingTitle}
      </h2>
      {uploading && progress.stage === "uploading" && (
        <div className="mt-6 w-full max-w-sm">
          <div
            role="progressbar"
            aria-label={t.form.progress.uploadTitle}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-3 overflow-hidden rounded-full bg-paper-deep"
          >
            <div
              className="h-full rounded-full bg-forest-700 transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-[17px] font-semibold text-ink tabular-nums">{percent} %</p>
          <p className="mt-1 text-sm text-ink-muted tabular-nums">
            {progress.total > 1 && `${t.form.progress.file(progress.current, progress.total)} · `}
            {formatFileSize(progress.loaded, locale)} / {formatFileSize(progress.totalBytes, locale)}
          </p>
        </div>
      )}
      <p className="mt-6 max-w-xs text-[15px] text-ink-soft">{t.form.progress.keepOpen}</p>
    </div>
  );
}

interface SermonFormProps {
  mode: "create" | "edit";
  initial: SermonDraft;
  initialFiles?: AudioFile[];
  /** Désactive l'envoi (ex. rafraîchissement des données après un enregistrement). */
  busy?: boolean;
  /** Où mène « Quitter ». */
  exitHref: string;
  /** Contenu affiché sous le récapitulatif (ex. suppression). */
  reviewFooter?: ReactNode;
  /** Enregistre réellement (téléversement + base). Le formulaire affiche la progression et les erreurs. */
  onSubmit: (
    values: SermonDraft,
    files: AudioDraft[],
    onProgress: (progress: SaveProgress) => void,
  ) => Promise<SaveResult>;
}

/**
 * Parcours d'ajout ou de modification d'une prédication, une étape à la fois :
 * thème et date → références → audio → vérification et publication.
 * En modification, on arrive directement sur le récapitulatif.
 */
export function SermonForm({
  mode,
  initial,
  initialFiles = [],
  busy = false,
  exitHref,
  reviewFooter,
  onSubmit,
}: SermonFormProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [stepIndex, setStepIndex] = useState(mode === "edit" ? REVIEW : 0);
  const [reachedReview, setReachedReview] = useState(mode === "edit");
  const [showErrors, setShowErrors] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const [date, setDate] = useState(initial.date);
  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);
  const [language, setLanguage] = useState<SermonLanguage>(initial.language);
  const [progress, setProgress] = useState<SaveProgress | null>(null);
  const [submitError, setSubmitError] = useState<SaveError>();
  const [rows, setRows] = useState<ReferenceRow[]>(() =>
    (initial.scriptureReferences.length > 0 ? initial.scriptureReferences : [""]).map((value, index) => ({
      id: `initial-${index}`,
      value,
    })),
  );
  const [files, setFiles] = useState<AudioDraft[]>(() =>
    initialFiles.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      duration: file.duration,
      format: file.format,
      size: file.size,
      downloadable: file.downloadable,
      storagePath: file.storagePath,
      source: "existing" as const,
    })),
  );
  const [recorderStatus, setRecorderStatus] = useState<RecorderStatus>("idle");

  const step = STEPS[stepIndex];
  const recorderBusy =
    recorderStatus === "recording" || recorderStatus === "paused" || recorderStatus === "requesting";
  const values: Values = { date, title, rows };
  const errors: FormErrors = showErrors ? validateStep(step, values, recorderBusy) : { rowErrors: {} };
  const submitting = progress !== null || busy;

  const dirty =
    JSON.stringify([date, title, rows.map((r) => r.value.trim()).filter(Boolean), notes.trim(), language]) !==
      JSON.stringify([
        initial.date,
        initial.title,
        initial.scriptureReferences.filter(Boolean),
        initial.notes.trim(),
        initial.language,
      ]) ||
    JSON.stringify(files.map((f) => [f.id, f.name])) !== JSON.stringify(initialFiles.map((f) => [f.id, f.name]));

  // Libération des URL blob au démontage (après enregistrement, les fichiers sont dans Storage).
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => {
    return () => {
      for (const file of filesRef.current) {
        if (file.url && file.source !== "existing") URL.revokeObjectURL(file.url);
      }
    };
  }, []);

  // Fermeture de l'onglet avec des changements non enregistrés (ex. un enregistrement micro).
  useEffect(() => {
    if (!dirty && !submitting) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, submitting]);

  const handleRecorderStatus = useCallback((status: RecorderStatus) => setRecorderStatus(status), []);

  const fieldIds = {
    date: `${id}-date`,
    title: `${id}-title`,
    notes: `${id}-notes`,
    references: `${id}-refs`,
    audio: `${id}-audio`,
  };

  function focusFirstError(stepErrors: FormErrors) {
    const firstRow = Object.keys(stepErrors.rowErrors)[0];
    const target = stepErrors.title
      ? fieldIds.title
      : stepErrors.date
        ? fieldIds.date
        : stepErrors.references
          ? `${fieldIds.references}-${rows[0]?.id}`
          : firstRow
            ? `${fieldIds.references}-${firstRow}`
            : fieldIds.audio;
    requestAnimationFrame(() => document.getElementById(target)?.focus());
  }

  function goTo(index: number) {
    setShowErrors(false);
    setSubmitError(undefined);
    setStepIndex(index);
    if (index === REVIEW) setReachedReview(true);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  /** Valide l'étape courante avant de la quitter. */
  function leaveStep(next: number) {
    const stepErrors = validateStep(step, values, recorderBusy);
    if (hasErrors(stepErrors)) {
      setShowErrors(true);
      focusFirstError(stepErrors);
      return;
    }
    goTo(next);
  }

  const atStart = stepIndex === 0 || (mode === "edit" && stepIndex === REVIEW);

  function requestExit() {
    if (dirty) setConfirmExit(true);
    else router.push(exitHref);
  }

  function handleBack() {
    if (atStart) {
      requestExit();
      return;
    }
    // On ne quitte pas l'étape audio pendant une capture : elle serait perdue.
    if (step === "audio" && recorderBusy) {
      leaveStep(stepIndex - 1);
      return;
    }
    goTo(stepIndex - 1);
  }

  async function submit(published: boolean) {
    if (submitting) return;
    // Vérification finale de toutes les étapes.
    for (const [index, name] of STEPS.entries()) {
      const stepErrors = validateStep(name, values, recorderBusy);
      if (hasErrors(stepErrors)) {
        goTo(index);
        setShowErrors(true);
        focusFirstError(stepErrors);
        return;
      }
    }

    setSubmitError(undefined);
    setProgress({ stage: "uploading", current: 0, total: 0, loaded: 0, totalBytes: 0 });
    window.scrollTo({ top: 0 });
    const result = await onSubmit(
      {
        date,
        title: title.trim(),
        scriptureReferences: rows.map((row) => row.value.trim()).filter(Boolean),
        notes: notes.trim(),
        language,
        published,
      },
      files,
      setProgress,
    );
    setProgress(null);
    if (!result.ok) {
      setSubmitError(result.error);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  if (progress) return <UploadProgress progress={progress} />;

  const continueLabel = reachedReview
    ? t.form.backToReview
    : step === "audio" && files.length === 0
      ? t.form.skipAudio
      : t.form.next;
  const filledRefs = rows.map((row) => row.value.trim()).filter(Boolean);
  const editingPublished = mode === "edit" && initial.published;

  return (
    <div>
      {/* En-tête du parcours : retour, quitter, progression */}
      <div className="flex min-h-11 items-center justify-between gap-2">
        <Button variant="ghost" onClick={handleBack} className="-ml-4">
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
          {atStart ? t.form.quit : t.form.previous}
        </Button>
        {!atStart && (
          <Button variant="ghost" onClick={requestExit} className="-mr-4">
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
            {t.form.quit}
          </Button>
        )}
      </div>

      <div className="mt-3">
        <h1 className="text-sm font-medium text-ink-muted">
          {mode === "create" ? t.form.newTitle : t.form.editTitle}
          <span aria-hidden="true"> · </span>
          {t.form.stepOf(stepIndex + 1, STEPS.length)}
        </h1>
        <div aria-hidden="true" className="mt-2 grid grid-cols-4 gap-1.5">
          {STEPS.map((name, index) => (
            <span key={name} className={cn("h-1.5 rounded-full", index <= stepIndex ? "bg-forest-700" : "bg-line")} />
          ))}
        </div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-5 font-display text-[1.9rem] leading-tight text-ink focus:outline-none sm:text-4xl"
        >
          {t.form.steps[step]}
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{t.form.stepHints[step]}</p>
      </div>

      <div className="mt-6">
        {step === "details" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor={fieldIds.title}>{t.form.title}</Label>
              <Input
                id={fieldIds.title}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.form.titlePlaceholder}
                maxLength={SERMON_TITLE_MAX + 40}
                enterKeyHint="next"
                aria-invalid={errors.title ? true : undefined}
                aria-describedby={errors.title ? `${fieldIds.title}-error` : undefined}
                inputSize="lg"
              />
              <FieldError id={`${fieldIds.title}-error`}>{errors.title && t.form.errors[errors.title]}</FieldError>
            </div>

            <div>
              <Label htmlFor={fieldIds.date}>{t.form.date}</Label>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setDate(toIsoDate(new Date()))}>
                  {t.form.today}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const sunday = new Date();
                    sunday.setDate(sunday.getDate() - sunday.getDay());
                    setDate(toIsoDate(sunday));
                  }}
                >
                  {t.form.lastSunday}
                </Button>
              </div>
              <Input
                id={fieldIds.date}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? `${fieldIds.date}-error` : undefined}
                className="max-w-xs"
              />
              <FieldError id={`${fieldIds.date}-error`}>{errors.date && t.form.errors[errors.date]}</FieldError>
            </div>
          </div>
        )}

        {step === "references" && (
          <div className="space-y-8">
            <ScriptureReferencesField
              idPrefix={fieldIds.references}
              rows={rows}
              onChange={setRows}
              error={errors.references && t.form.errors[errors.references]}
              rowErrors={Object.fromEntries(
                Object.entries(errors.rowErrors).map(([rowId, key]) => [rowId, t.form.errors[key]]),
              )}
            />
            <div>
              <Label htmlFor={fieldIds.notes} optionalLabel={t.common.optional}>
                {t.form.notes}
              </Label>
              <Textarea
                id={fieldIds.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.form.notesPlaceholder}
                rows={5}
              />
            </div>
          </div>
        )}

        {step === "audio" && (
          <div id={fieldIds.audio} tabIndex={-1} className="focus:outline-none">
            <AudioFilesField files={files} setFiles={setFiles} onRecorderStatusChange={handleRecorderStatus} />
            {errors.recording && (
              <Alert tone="error" role="alert" className="mt-4">
                {t.form.errors[errors.recording]}
              </Alert>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-3">
            {submitError && (
              <div ref={errorRef} tabIndex={-1} className="focus:outline-none">
                <Alert tone="error" role="alert" title={t.form.saveErrors.title}>
                  {t.form.saveErrors[submitError]}
                </Alert>
              </div>
            )}

            <ReviewBlock title={t.form.steps.details} editLabel={t.form.edit} onEdit={() => goTo(0)}>
              <p className="font-display text-[1.4rem] leading-snug text-ink">{title.trim()}</p>
              {isValidIsoDate(date) && <p className="mt-1 text-[15px] text-ink-soft">{formatDate(date, locale)}</p>}
            </ReviewBlock>

            <ReviewBlock title={t.form.steps.references} editLabel={t.form.edit} onEdit={() => goTo(1)}>
              <ul className="flex flex-wrap gap-2 pt-1">
                {filledRefs.map((reference) => (
                  <li
                    key={reference}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-[15px] text-ink"
                  >
                    <BookOpen aria-hidden="true" className="size-4 text-gold-700" strokeWidth={1.75} />
                    {reference}
                  </li>
                ))}
              </ul>
              {notes.trim() && (
                <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">
                  {notes.trim()}
                </p>
              )}
            </ReviewBlock>

            <ReviewBlock title={t.form.steps.audio} editLabel={t.form.edit} onEdit={() => goTo(2)}>
              {files.length === 0 ? (
                <p className="flex items-start gap-2 text-[15px] text-gold-700">
                  <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                  {t.form.reviewNoAudio}
                </p>
              ) : (
                <ul className="space-y-1.5 pt-1">
                  {files.map((file) => (
                    <li key={file.id} className="flex items-center gap-2.5 text-[15px] text-ink">
                      <Mic aria-hidden="true" className="size-4 shrink-0 text-forest-700" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 truncate">{file.name.trim() || file.format.toUpperCase()}</span>
                      {file.duration !== null && (
                        <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                          {formatClock(file.duration)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </ReviewBlock>

            <fieldset className="rounded-3xl bg-surface p-5 ring-1 ring-line">
              <legend className="float-left text-sm font-medium text-ink-muted">{t.form.language}</legend>
              <div className="clear-left grid grid-cols-2 gap-2 pt-3">
                {(["fr", "en"] as const).map((code) => (
                  <label
                    key={code}
                    className={cn(
                      "flex h-12 cursor-pointer items-center justify-center rounded-xl border text-[15px] font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-forest-500",
                      language === code
                        ? "border-forest-700 bg-forest-700 text-paper"
                        : "border-line-strong bg-surface text-ink hover:bg-paper",
                    )}
                  >
                    <input
                      type="radio"
                      name={`${id}-language`}
                      value={code}
                      checked={language === code}
                      onChange={() => setLanguage(code)}
                      className="sr-only"
                    />
                    {t.form.languages[code]}
                  </label>
                ))}
              </div>
            </fieldset>

            {editingPublished && <p className="px-1 text-sm text-ink-muted">{t.form.currentlyPublished}</p>}
          </div>
        )}
      </div>

      {/* Actions principales, à portée du pouce */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:px-0">
        {step === "review" ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
              <Button size="xl" onClick={() => submit(true)} disabled={submitting} className="w-full sm:w-auto">
                {busy && <LoaderCircle aria-hidden="true" className="size-5 animate-spin" strokeWidth={2} />}
                {editingPublished ? t.form.saveChanges : t.form.publish}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => submit(false)}
                disabled={submitting}
                className="w-full sm:h-14 sm:w-auto"
              >
                {editingPublished ? t.form.unpublish : t.form.saveDraft}
              </Button>
            </div>
            <p className="mt-2 text-center text-[13px] text-ink-muted sm:text-left">{t.form.publishHelp}</p>
          </>
        ) : (
          <Button
            size="xl"
            onClick={() => leaveStep(reachedReview ? REVIEW : stepIndex + 1)}
            className="w-full sm:w-auto sm:min-w-56"
          >
            {continueLabel}
          </Button>
        )}
      </div>

      {step === "review" && reviewFooter}

      <ConfirmDialog
        open={confirmExit}
        title={t.form.quitTitle}
        confirmLabel={t.form.quitConfirm}
        cancelLabel={t.form.stay}
        onConfirm={() => {
          setConfirmExit(false);
          router.push(exitHref);
        }}
        onCancel={() => setConfirmExit(false)}
      >
        {t.form.quitText}
      </ConfirmDialog>
    </div>
  );
}
