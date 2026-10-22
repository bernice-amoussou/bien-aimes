"use client";

import { ChevronRight, Eye, Plus, Search, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteSermonAction, type ActionErrorCode } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import { EMPTY_FILTERS, filterSermons } from "@/lib/sermon-utils";
import type { Sermon } from "@/types/sermon";
import { AdminPageHeader } from "./admin-shell";
import { useAdmin } from "./admin-store";
import { StatusBadge } from "./status-badge";

const actionClass =
  "relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors";

/** Ligne d'une prédication dans l'administration : toute la ligne ouvre la modification. */
export function AdminSermonRow({ sermon, onDelete }: { sermon: Sermon; onDelete?: (sermon: Sermon) => void }) {
  const { t, locale } = useI18n();
  const fileCount = sermon.audioFiles.length;

  return (
    <div className="group relative -mx-3 flex items-center gap-2 rounded-2xl px-3 py-3 transition-colors hover:bg-paper-deep/70">
      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/predications/${sermon.id}/modifier`}
          aria-label={`${t.admin.sermons.edit} — ${sermon.title}`}
          className="line-clamp-2 font-display text-[1.2rem] leading-snug text-ink after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:text-forest-700"
        >
          {sermon.title}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <StatusBadge published={sermon.published} />
          <time dateTime={sermon.date}>{formatDate(sermon.date, locale, "short")}</time>
          <span aria-hidden="true">·</span>
          <span className={fileCount === 0 ? "text-gold-700" : undefined}>
            {fileCount === 0 ? t.admin.sermons.noAudio : t.sermon.recordings(fileCount)}
          </span>
        </p>
      </div>
      {sermon.published && (
        <Link
          href={`/predications/${sermon.id}`}
          className={cn(actionClass, "hover:bg-surface hover:text-ink")}
          aria-label={`${t.admin.sermons.view} — ${sermon.title}`}
          title={t.admin.sermons.view}
        >
          <Eye aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </Link>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(sermon)}
          className={cn(actionClass, "hover:bg-danger-50 hover:text-danger-600")}
          aria-label={`${t.admin.sermons.delete} — ${sermon.title}`}
          title={t.admin.sermons.delete}
        >
          <Trash2 aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </button>
      )}
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted/50" strokeWidth={1.75} />
    </div>
  );
}

type Feedback = { tone: "success"; title: string } | { tone: "error"; code: ActionErrorCode };

export function AdminSermonsTable() {
  const { t } = useI18n();
  const router = useRouter();
  const { sermons, isAdmin } = useAdmin();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Sermon | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [deleting, startDelete] = useTransition();

  const rows = useMemo(() => filterSermons(sermons, { ...EMPTY_FILTERS, query }), [sermons, query]);

  function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    startDelete(async () => {
      const result = await deleteSermonAction(target.id);
      setPendingDelete(null);
      if (result.ok) {
        setFeedback({ tone: "success", title: target.title });
        router.refresh();
      } else {
        setFeedback({ tone: "error", code: result.error });
      }
    });
  }

  return (
    <>
      <AdminPageHeader
        title={t.admin.sermons.title}
        subtitle={t.admin.sermons.subtitle(sermons.length)}
        action={
          <div className="hidden sm:block">
            <ButtonLink href="/admin/predications/nouvelle" size="lg">
              <Plus aria-hidden="true" className="size-5" strokeWidth={1.75} />
              {t.admin.overview.add}
            </ButtonLink>
          </div>
        }
      />

      <div aria-live="polite">
        {feedback?.tone === "success" && (
          <Alert tone="success" role="status" className="mb-5">
            {t.admin.sermons.deleted(feedback.title)}
          </Alert>
        )}
        {feedback?.tone === "error" && (
          <Alert tone="error" role="alert" className="mb-5">
            {t.form.saveErrors[feedback.code]}
          </Alert>
        )}
      </div>

      {sermons.length > 0 && (
        <div className="relative mb-3">
          <label htmlFor="admin-filter" className="sr-only">
            {t.admin.sermons.search}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.75}
          />
          <input
            id="admin-filter"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.admin.sermons.search}
            className="h-12 w-full rounded-full border border-line-strong bg-surface pr-4 pl-12 text-base text-ink placeholder:text-ink-muted focus:border-forest-500 focus:ring-3 focus:ring-forest-500/15 focus:outline-none"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={sermons.length === 0 ? t.admin.overview.empty : t.admin.sermons.empty}
          action={
            sermons.length === 0 && (
              <ButtonLink href="/admin/predications/nouvelle" size="xl">
                <Plus aria-hidden="true" className="size-5" strokeWidth={1.75} />
                {t.admin.overview.add}
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="space-y-1">
          {rows.map((sermon) => (
            <li key={sermon.id}>
              <AdminSermonRow
                sermon={sermon}
                onDelete={
                  isAdmin
                    ? (target) => {
                        setFeedback(null);
                        setPendingDelete(target);
                      }
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
      {!isAdmin && sermons.length > 0 && (
        <p className="mt-4 text-sm text-ink-muted">{t.admin.sermons.deleteAdminOnly}</p>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.admin.sermons.deleteTitle}
        confirmLabel={deleting ? t.admin.sermons.deleting : t.admin.sermons.deleteConfirm}
        cancelLabel={t.common.cancel}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      >
        {pendingDelete && t.admin.sermons.deleteText(pendingDelete.title)}
      </ConfirmDialog>
    </>
  );
}
