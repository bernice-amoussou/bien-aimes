"use client";

import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";
import type { SaveError, SaveProgress, SaveResult } from "@/lib/admin/save-sermon";
import type { RecorderStatus } from "@/lib/audio/use-audio-recorder";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { useI18n } from "@/lib/i18n/locale-provider";
import { SERMON_TITLE_MAX, isValidIsoDate } from "@/lib/sermon-utils";
import type { AudioDraft } from "@/types/audio-draft";
import type { AudioFile, SermonDraft, SermonLanguage } from "@/types/sermon";
import { AudioFilesField } from "./audio-files-field";
import { ScriptureReferencesField, type ReferenceRow } from "./scripture-references-field";

type ErrorKey = keyof Dictionary["form"]["errors"];

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

function validate(values: Values, recorderBusy: boolean): FormErrors {
  const errors: FormErrors = { rowErrors: {} };
  if (!values.date) errors.date = "dateRequired";
  else if (!isValidIsoDate(values.date)) errors.date = "dateInvalid";

  const title = values.title.trim();
  if (!title) errors.title = "titleRequired";
  else if (title.length > SERMON_TITLE_MAX) errors.title = "titleTooLong";

  const filled = values.rows.filter((row) => row.value.trim());
  if (filled.length === 0) errors.references = "referencesRequired";
  else {
    for (const row of values.rows) {
      if (!row.value.trim()) errors.rowErrors[row.id] = "referenceEmpty";
    }
  }

  if (recorderBusy) errors.recording = "recordingInProgress";
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

function FormSection({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-6">
      <h2 className="font-display text-[1.5rem] leading-tight text-ink sm:text-[1.75rem]">{title}</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{hint}</p>
      <div className="mt-5">{children}</div>
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
  /** Contenu affiché sous le formulaire (ex. suppression). */
  reviewFooter?: ReactNode;
  /** Enregistre réellement (téléversement + base). Le formulaire affiche la progression et les erreurs. */
  onSubmit: (
    values: SermonDraft,
    files: AudioDraft[],
    onProgress: (progress: SaveProgress) => void,
  ) => Promise<SaveResult>;
}

/**
 * Formulaire d'ajout ou de modification d'une prédication, sur une seule page :
 * thème et date, références, audio, langue, puis publication ou brouillon.
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
  const { t } = useI18n();
  const router = useRouter();
  const id = useId();
  const errorRef = useRef<HTMLDivElement>(null);

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

  const recorderBusy =
    recorderStatus === "recording" || recorderStatus === "paused" || recorderStatus === "requesting";
  const values: Values = { date, title, rows };
  // Après une tentative d'envoi, les erreurs suivent la saisie.
  const errors: FormErrors = showErrors ? validate(values, recorderBusy) : { rowErrors: {} };
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

  /** Amène le premier champ en erreur à l'écran, dans l'ordre de la page. */
  function focusFirstError(formErrors: FormErrors) {
    const firstRow = Object.keys(formErrors.rowErrors)[0];
    const target = formErrors.title
      ? fieldIds.title
      : formErrors.date
        ? fieldIds.date
        : formErrors.references
          ? `${fieldIds.references}-${rows[0]?.id}`
          : firstRow
            ? `${fieldIds.references}-${firstRow}`
            : fieldIds.audio;
    requestAnimationFrame(() => {
      const element = document.getElementById(target);
      element?.scrollIntoView({ block: "center" });
      element?.focus({ preventScroll: true });
    });
  }

  function requestExit() {
    if (dirty) setConfirmExit(true);
    else router.push(exitHref);
  }

  async function submit(published: boolean) {
    if (submitting) return;
    const formErrors = validate(values, recorderBusy);
    if (hasErrors(formErrors)) {
      setShowErrors(true);
      focusFirstError(formErrors);
      return;
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
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ block: "center" });
        errorRef.current?.focus({ preventScroll: true });
      });
    }
  }

  if (progress) return <UploadProgress progress={progress} />;

  const editingPublished = mode === "edit" && initial.published;

  return (
    <div>
      {/* En-tête : quitter, titre */}
      <div className="flex min-h-11 items-center">
        <Button variant="ghost" onClick={requestExit} className="-ml-4">
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
          {t.form.quit}
        </Button>
      </div>

      <h1 className="mt-3 font-display text-[1.9rem] leading-tight text-ink sm:text-4xl">
        {mode === "create" ? t.form.newTitle : t.form.editTitle}
      </h1>
      {editingPublished && <p className="mt-1.5 text-[15px] text-ink-muted">{t.form.currentlyPublished}</p>}

      {submitError && (
        <div ref={errorRef} tabIndex={-1} className="mt-6 focus:outline-none">
          <Alert tone="error" role="alert" title={t.form.saveErrors.title}>
            {t.form.saveErrors[submitError]}
          </Alert>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <FormSection title={t.form.steps.details} hint={t.form.stepHints.details}>
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
        </FormSection>

        <FormSection title={t.form.steps.references} hint={t.form.stepHints.references}>
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
        </FormSection>

        <FormSection title={t.form.steps.audio} hint={t.form.stepHints.audio}>
          <div id={fieldIds.audio} tabIndex={-1} className="focus:outline-none">
            <AudioFilesField files={files} setFiles={setFiles} onRecorderStatusChange={handleRecorderStatus} />
            {errors.recording && (
              <Alert tone="error" role="alert" className="mt-4">
                {t.form.errors[errors.recording]}
              </Alert>
            )}
          </div>
        </FormSection>

        <fieldset className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-6">
          <legend className="float-left font-display text-[1.5rem] leading-tight text-ink sm:text-[1.75rem]">
            {t.form.language}
          </legend>
          <div className="clear-left grid grid-cols-2 gap-2 pt-4">
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
      </div>

      {/* Actions principales, à portée du pouce */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:px-0">
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
      </div>

      {reviewFooter}

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
