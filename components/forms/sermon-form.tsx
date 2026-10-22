"use client";

import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import type { SaveError, SaveProgress, SaveResult } from "@/lib/admin/save-sermon";
import type { RecorderStatus } from "@/lib/audio/use-audio-recorder";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { SERMON_TITLE_MAX, isValidIsoDate } from "@/lib/sermon-utils";
import type { AudioDraft } from "@/types/audio-draft";
import type { AudioFile, SermonDraft, SermonLanguage } from "@/types/sermon";
import { AudioFilesField } from "./audio-files-field";
import { ScriptureReferencesField, type ReferenceRow } from "./scripture-references-field";

type ErrorKey = Exclude<keyof Dictionary["form"]["errors"], "summary">;

interface FormErrors {
  date?: ErrorKey;
  title?: ErrorKey;
  references?: ErrorKey;
  rowErrors: Record<string, ErrorKey>;
  recording?: ErrorKey;
}

function validate(
  values: { date: string; title: string; rows: ReferenceRow[] },
  recorderBusy: boolean,
): FormErrors {
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

function countErrors(errors: FormErrors) {
  return (
    [errors.date, errors.title, errors.references, errors.recording].filter(Boolean).length +
    Object.keys(errors.rowErrors).length
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-line py-10 first:border-t-0 first:pt-0 lg:grid-cols-[14rem_1fr] lg:gap-12">
      <div>
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

interface SermonFormProps {
  mode: "create" | "edit";
  initial: SermonDraft;
  initialFiles?: AudioFile[];
  /** Désactive l'envoi (ex. rafraîchissement des données après un enregistrement). */
  busy?: boolean;
  /** Enregistre réellement (téléversement + base). Le formulaire affiche la progression et les erreurs. */
  onSubmit: (
    values: SermonDraft,
    files: AudioDraft[],
    onProgress: (progress: SaveProgress) => void,
  ) => Promise<SaveResult>;
}

/**
 * Formulaire de prédication : validation, import et capture audio,
 * puis enregistrement via `onSubmit` avec progression réelle.
 */
export function SermonForm({ mode, initial, initialFiles = [], busy = false, onSubmit }: SermonFormProps) {
  const { t } = useI18n();
  const id = useId();
  const summaryRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState(initial.date);
  const [title, setTitle] = useState(initial.title);
  const [preacher, setPreacher] = useState(initial.preacher);
  const [notes, setNotes] = useState(initial.notes);
  const [language, setLanguage] = useState<SermonLanguage>(initial.language);
  const [published, setPublished] = useState(initial.published);
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
  const [errors, setErrors] = useState<FormErrors | null>(null);

  const recorderBusy = recorderStatus === "recording" || recorderStatus === "paused" || recorderStatus === "requesting";

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

  // Après une tentative d'envoi, les erreurs suivent la saisie.
  const shownErrors = errors ? validate({ date, title, rows }, recorderBusy) : null;
  const errorCount = shownErrors ? countErrors(shownErrors) : 0;

  const handleRecorderStatus = useCallback((status: RecorderStatus) => setRecorderStatus(status), []);

  const submitting = progress !== null || busy;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validate({ date, title, rows }, recorderBusy);
    setErrors(nextErrors);
    setSubmitError(undefined);
    if (countErrors(nextErrors) > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setProgress({ stage: "uploading", current: 0, total: 0 });
    const result = await onSubmit(
      {
        date,
        title: title.trim(),
        scriptureReferences: rows.map((row) => row.value.trim()).filter(Boolean),
        preacher: preacher.trim(),
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
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const fieldIds = {
    date: `${id}-date`,
    title: `${id}-title`,
    preacher: `${id}-preacher`,
    notes: `${id}-notes`,
    references: `${id}-refs`,
  };

  const summaryLinks: { href: string; message: string }[] = [];
  if (shownErrors?.date) summaryLinks.push({ href: fieldIds.date, message: t.form.errors[shownErrors.date] });
  if (shownErrors?.title) summaryLinks.push({ href: fieldIds.title, message: t.form.errors[shownErrors.title] });
  if (shownErrors?.references)
    summaryLinks.push({ href: `${fieldIds.references}-${rows[0]?.id}`, message: t.form.errors[shownErrors.references] });
  for (const [rowId, key] of Object.entries(shownErrors?.rowErrors ?? {})) {
    summaryLinks.push({ href: `${fieldIds.references}-${rowId}`, message: t.form.errors[key] });
  }
  if (shownErrors?.recording) summaryLinks.push({ href: `${id}-audio`, message: t.form.errors[shownErrors.recording] });

  return (
    <form noValidate onSubmit={handleSubmit}>
      {submitError && errorCount === 0 && (
        <div ref={summaryRef} tabIndex={-1} className="mb-8 focus:outline-none">
          <Alert tone="error" role="alert" title={t.form.saveErrors.title}>
            {t.form.saveErrors[submitError]}
          </Alert>
        </div>
      )}
      {errorCount > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="mb-8 focus:outline-none">
          <Alert tone="error" role="alert" title={t.form.errors.summary(errorCount)}>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {summaryLinks.map((link) => (
                <li key={`${link.href}-${link.message}`}>
                  <a href={`#${link.href}`} className="underline underline-offset-2 hover:no-underline">
                    {link.message}
                  </a>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      <FormSection title={t.form.sections.details} description={t.form.sections.detailsHint}>
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-[12rem_1fr]">
            <div>
              <Label htmlFor={fieldIds.date} required>
                {t.form.date}
              </Label>
              <Input
                id={fieldIds.date}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                aria-invalid={shownErrors?.date ? true : undefined}
                aria-describedby={shownErrors?.date ? `${fieldIds.date}-error` : undefined}
              />
              <FieldError id={`${fieldIds.date}-error`}>
                {shownErrors?.date && t.form.errors[shownErrors.date]}
              </FieldError>
            </div>
            <div>
              <Label htmlFor={fieldIds.preacher} optionalLabel={t.common.optional}>
                {t.form.preacher}
              </Label>
              <Input
                id={fieldIds.preacher}
                value={preacher}
                onChange={(e) => setPreacher(e.target.value)}
                placeholder={t.form.preacherPlaceholder}
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={fieldIds.title} required>
              {t.form.title}
            </Label>
            <Input
              id={fieldIds.title}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.form.titlePlaceholder}
              required
              maxLength={SERMON_TITLE_MAX + 40}
              aria-invalid={shownErrors?.title ? true : undefined}
              aria-describedby={shownErrors?.title ? `${fieldIds.title}-error` : undefined}
              className="font-display text-lg"
            />
            <FieldError id={`${fieldIds.title}-error`}>
              {shownErrors?.title && t.form.errors[shownErrors.title]}
            </FieldError>
          </div>

          <ScriptureReferencesField
            idPrefix={fieldIds.references}
            rows={rows}
            onChange={setRows}
            error={shownErrors?.references && t.form.errors[shownErrors.references]}
            rowErrors={Object.fromEntries(
              Object.entries(shownErrors?.rowErrors ?? {}).map(([rowId, key]) => [rowId, t.form.errors[key]]),
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

      <FormSection title={t.form.sections.audio} description={t.form.sections.audioHint}>
        <div id={`${id}-audio`} tabIndex={-1} className="focus:outline-none">
          <AudioFilesField files={files} setFiles={setFiles} onRecorderStatusChange={handleRecorderStatus} />
          {shownErrors?.recording && (
            <Alert tone="error" className="mt-4">
              {t.form.errors[shownErrors.recording]}
            </Alert>
          )}
        </div>
      </FormSection>

      <FormSection title={t.form.sections.publication} description={t.form.sections.publicationHint}>
        <div className="grid gap-6 sm:grid-cols-[12rem_1fr] sm:items-start">
          <div>
            <Label htmlFor={`${id}-language`}>{t.form.language}</Label>
            <Select
              id={`${id}-language`}
              value={language}
              onChange={(e) => setLanguage(e.target.value as SermonLanguage)}
            >
              <option value="fr">{t.form.languages.fr}</option>
              <option value="en">{t.form.languages.en}</option>
            </Select>
          </div>
          <div className="sm:pt-7">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                aria-describedby={`${id}-published-hint`}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-forest-700"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{t.form.published}</span>
                <FieldHint id={`${id}-published-hint`}>
                  {published ? t.form.publishedHint : t.form.draftHint}
                </FieldHint>
              </span>
            </label>
          </div>
        </div>
      </FormSection>

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:px-0">
        <p aria-live="polite" className="text-sm text-ink-muted sm:mr-auto sm:self-center">
          {progress?.stage === "uploading" && progress.total > 0 && t.form.uploading(progress.current, progress.total)}
          {progress?.stage === "saving" && t.form.saving}
        </p>
        <ButtonLink
          href="/admin/predications"
          variant="secondary"
          aria-disabled={submitting}
          className={submitting ? "pointer-events-none opacity-50" : undefined}
        >
          {t.form.cancel}
        </ButtonLink>
        <Button type="submit" disabled={submitting}>
          {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.75} />}
          {mode === "create" ? t.form.submitNew : t.form.submitEdit}
        </Button>
      </div>
    </form>
  );
}
