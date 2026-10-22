"use client";

import { ArrowLeft, CircleCheck, ExternalLink, List, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSermonAction, type ActionErrorCode } from "@/app/admin/actions";
import { SermonForm } from "@/components/forms/sermon-form";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { saveSermon, type SaveProgress } from "@/lib/admin/save-sermon";
import { useI18n } from "@/lib/i18n/locale-provider";
import { createUuid } from "@/lib/sermon-utils";
import type { AudioDraft } from "@/types/audio-draft";
import type { Sermon, SermonDraft } from "@/types/sermon";
import { useAdmin } from "./admin-store";

const LIST_HREF = "/admin/predications";

/** Valeurs de départ du formulaire de création. */
const EMPTY_SERMON_DRAFT: SermonDraft = {
  date: "",
  title: "",
  scriptureReferences: [""],
  notes: "",
  language: "fr",
  published: false,
};

interface SavedSummary {
  id: string;
  files: number;
  published: boolean;
}

/** Confirmation claire après un enregistrement, avec les suites possibles. */
function SuccessView({
  saved,
  mode,
  onAgain,
}: {
  saved: SavedSummary;
  mode: "create" | "edit";
  onAgain: () => void;
}) {
  const { t } = useI18n();
  const title =
    mode === "edit" ? t.form.success.updatedTitle : saved.published ? t.form.success.publishedTitle : t.form.success.draftTitle;

  return (
    <div role="status" className="flex flex-col items-center py-10 text-center sm:py-16">
      <span className="flex size-20 items-center justify-center rounded-full bg-forest-50 text-forest-700">
        <CircleCheck aria-hidden="true" className="size-10" strokeWidth={1.75} />
      </span>
      <h1 className="mt-6 font-display text-[2rem] leading-tight text-ink">{title}</h1>
      <p className="mt-2 max-w-sm text-[17px] leading-relaxed text-ink-soft">
        {t.form.success.text(saved.files, saved.published)}
      </p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
        {saved.published && (
          <ButtonLink href={`/predications/${saved.id}`} size="xl">
            <ExternalLink aria-hidden="true" className="size-5" strokeWidth={1.75} />
            {t.form.success.viewOnSite}
          </ButtonLink>
        )}
        <Button size="xl" variant={saved.published ? "secondary" : "primary"} onClick={onAgain}>
          {mode === "create" ? (
            <Plus aria-hidden="true" className="size-5" strokeWidth={1.75} />
          ) : (
            <Pencil aria-hidden="true" className="size-5" strokeWidth={1.75} />
          )}
          {mode === "create" ? t.form.success.addAnother : t.form.success.keepEditing}
        </Button>
        <ButtonLink href={LIST_HREF} size="xl" variant="ghost">
          <List aria-hidden="true" className="size-5" strokeWidth={1.75} />
          {t.form.success.backToList}
        </ButtonLink>
      </div>
    </div>
  );
}

export function NewSermonView() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState<SavedSummary | null>(null);
  const [, startRefresh] = useTransition();

  async function handleSubmit(
    draft: SermonDraft,
    files: AudioDraft[],
    onProgress: (progress: SaveProgress) => void,
  ) {
    // Identifiant généré côté client : il sert aussi de dossier pour les fichiers audio.
    const result = await saveSermon(createUuid(), draft, files, onProgress);
    if (result.ok) {
      setSaved({ id: result.id, files: files.length, published: draft.published });
      startRefresh(() => router.refresh());
      window.scrollTo({ top: 0 });
    }
    return result;
  }

  if (saved) {
    return (
      <SuccessView
        saved={saved}
        mode="create"
        onAgain={() => {
          setSaved(null);
          setFormKey((key) => key + 1);
        }}
      />
    );
  }

  return (
    <SermonForm
      key={formKey}
      mode="create"
      initial={EMPTY_SERMON_DRAFT}
      exitHref={LIST_HREF}
      onSubmit={handleSubmit}
    />
  );
}

/** Clé qui change dès que la prédication enregistrée change : le formulaire repart des données serveur. */
function sermonSignature(sermon: Sermon) {
  return JSON.stringify([
    sermon.date,
    sermon.title,
    sermon.scriptureReferences,
    sermon.notes,
    sermon.language,
    sermon.published,
    sermon.audioFiles.map((f) => [f.id, f.name, f.downloadable]),
  ]);
}

function DeleteSermon({ sermon }: { sermon: Sermon }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);
  const [deleting, startDelete] = useTransition();

  function confirm() {
    startDelete(async () => {
      const result = await deleteSermonAction(sermon.id);
      if (result.ok) {
        router.push(LIST_HREF);
        router.refresh();
      } else {
        setOpen(false);
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-10">
      {error && (
        <Alert tone="error" role="alert" className="mb-3">
          {t.form.saveErrors[error]}
        </Alert>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium text-danger-700 transition-colors hover:bg-danger-50 sm:w-auto"
      >
        <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
        {t.form.deleteSermon}
      </button>
      <ConfirmDialog
        open={open}
        title={t.admin.sermons.deleteTitle}
        confirmLabel={deleting ? t.admin.sermons.deleting : t.admin.sermons.deleteConfirm}
        cancelLabel={t.common.cancel}
        busy={deleting}
        onConfirm={confirm}
        onCancel={() => {
          if (!deleting) setOpen(false);
        }}
      >
        {t.admin.sermons.deleteText(sermon.title)}
      </ConfirmDialog>
    </div>
  );
}

export function EditSermonView({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { sermons, isAdmin } = useAdmin();
  const sermon = sermons.find((s) => s.id === id);
  const [saved, setSaved] = useState<SavedSummary | null>(null);
  const [refreshing, startRefresh] = useTransition();

  if (!sermon) {
    return (
      <>
        <Link
          href={LIST_HREF}
          className="-ml-1 mb-6 inline-flex min-h-11 items-center gap-2 text-[15px] text-ink-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
          {t.admin.nav.sermons}
        </Link>
        <Alert tone="error" title={t.admin.sermons.notFound} />
      </>
    );
  }

  async function handleSubmit(
    draft: SermonDraft,
    files: AudioDraft[],
    onProgress: (progress: SaveProgress) => void,
  ) {
    const result = await saveSermon(id, draft, files, onProgress);
    if (result.ok) {
      setSaved({ id, files: files.length, published: draft.published });
      startRefresh(() => router.refresh());
      window.scrollTo({ top: 0 });
    }
    return result;
  }

  if (saved) {
    return <SuccessView saved={saved} mode="edit" onAgain={() => setSaved(null)} />;
  }

  return (
    <SermonForm
      key={sermonSignature(sermon)}
      mode="edit"
      busy={refreshing}
      exitHref={LIST_HREF}
      initial={{
        date: sermon.date,
        title: sermon.title,
        scriptureReferences: sermon.scriptureReferences,
        notes: sermon.notes ?? "",
        language: sermon.language,
        published: sermon.published,
      }}
      initialFiles={sermon.audioFiles}
      reviewFooter={isAdmin ? <DeleteSermon sermon={sermon} /> : undefined}
      onSubmit={handleSubmit}
    />
  );
}
