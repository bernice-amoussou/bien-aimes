"use client";

import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SermonForm } from "@/components/forms/sermon-form";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { DEMO_SERMON_DRAFT, EMPTY_SERMON_DRAFT } from "@/data/demo-form";
import { saveSermon, type SaveProgress } from "@/lib/admin/save-sermon";
import { useI18n } from "@/lib/i18n/locale-provider";
import { createUuid } from "@/lib/sermon-utils";
import type { AudioDraft } from "@/types/audio-draft";
import type { Sermon, SermonDraft } from "@/types/sermon";
import { AdminPageHeader } from "./admin-shell";
import { useAdmin } from "./admin-store";

function BackLink() {
  const { t } = useI18n();
  return (
    <Link
      href="/admin/predications"
      className="mb-6 inline-flex items-center gap-2 rounded-sm text-sm text-ink-muted hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
      {t.admin.nav.sermons}
    </Link>
  );
}

interface SavedSummary {
  id: string;
  files: number;
  published: boolean;
}

export function NewSermonView() {
  const { t } = useI18n();
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return result;
  }

  return (
    <>
      <BackLink />
      <AdminPageHeader title={t.form.newTitle} subtitle={t.form.newSubtitle} />

      {saved ? (
        <Alert
          tone="success"
          role="status"
          title={t.form.savedTitle}
          action={
            <>
              <ButtonLink href="/admin/predications" size="sm">
                {t.form.viewList}
              </ButtonLink>
              {saved.published && (
                <ButtonLink href={`/predications/${saved.id}`} size="sm" variant="secondary">
                  <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                  {t.form.viewOnSite}
                </ButtonLink>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSaved(null);
                  setFormKey((key) => key + 1);
                }}
              >
                <Plus aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                {t.form.addAnother}
              </Button>
            </>
          }
        >
          {t.form.savedText(saved.files, saved.published)}
        </Alert>
      ) : (
        <SermonForm
          key={formKey}
          mode="create"
          // Le premier formulaire est prérempli avec l'exemple demandé, les suivants sont vides.
          initial={formKey === 0 ? DEMO_SERMON_DRAFT : EMPTY_SERMON_DRAFT}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}

/** Clé qui change dès que la prédication enregistrée change : le formulaire repart des données serveur. */
function sermonSignature(sermon: Sermon) {
  return JSON.stringify([
    sermon.date,
    sermon.title,
    sermon.scriptureReferences,
    sermon.preacher,
    sermon.notes,
    sermon.language,
    sermon.published,
    sermon.audioFiles.map((f) => [f.id, f.name, f.downloadable]),
  ]);
}

export function EditSermonView({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { sermons } = useAdmin();
  const sermon = sermons.find((s) => s.id === id);
  const [saved, setSaved] = useState<SavedSummary | null>(null);
  const [refreshing, startRefresh] = useTransition();

  if (!sermon) {
    return (
      <>
        <BackLink />
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return result;
  }

  return (
    <>
      <BackLink />
      <AdminPageHeader
        title={t.form.editTitle}
        subtitle={t.form.editSubtitle}
        action={
          sermon.published && (
            <ButtonLink href={`/predications/${sermon.id}`} variant="secondary">
              <ExternalLink aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t.form.viewOnSite}
            </ButtonLink>
          )
        }
      />
      {saved && (
        <Alert tone="success" role="status" title={t.form.savedTitle} className="mb-8">
          {t.form.savedText(saved.files, saved.published)}
        </Alert>
      )}
      <SermonForm
        key={sermonSignature(sermon)}
        mode="edit"
        busy={refreshing}
        initial={{
          date: sermon.date,
          title: sermon.title,
          scriptureReferences: sermon.scriptureReferences,
          preacher: sermon.preacher ?? "",
          notes: sermon.notes ?? "",
          language: sermon.language,
          published: sermon.published,
        }}
        initialFiles={sermon.audioFiles}
        onSubmit={handleSubmit}
      />
    </>
  );
}
