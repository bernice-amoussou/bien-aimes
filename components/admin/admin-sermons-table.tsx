"use client";

import { Eye, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteSermonAction, type ActionErrorCode } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { inputStyles } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatDate, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import { EMPTY_FILTERS, filterSermons, getTotalDuration } from "@/lib/sermon-utils";
import type { Sermon } from "@/types/sermon";
import { AdminPageHeader } from "./admin-shell";
import { useAdmin } from "./admin-store";
import { StatusBadge } from "./status-badge";

const actionClass =
  "inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink";

type Feedback = { tone: "success"; title: string } | { tone: "error"; code: ActionErrorCode };

export function AdminSermonsTable() {
  const { t, locale } = useI18n();
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

  function actions(sermon: Sermon) {
    return (
      <div className="flex items-center justify-end gap-0.5">
        {sermon.published && (
          <Link
            href={`/predications/${sermon.id}`}
            className={actionClass}
            aria-label={`${t.admin.sermons.view} — ${sermon.title}`}
            title={t.admin.sermons.view}
          >
            <Eye aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        )}
        <Link
          href={`/admin/predications/${sermon.id}/modifier`}
          className={actionClass}
          aria-label={`${t.admin.sermons.edit} — ${sermon.title}`}
          title={t.admin.sermons.edit}
        >
          <Pencil aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </Link>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setPendingDelete(sermon);
            }}
            className={cn(actionClass, "hover:bg-danger-50 hover:text-danger-600")}
            aria-label={`${t.admin.sermons.delete} — ${sermon.title}`}
            title={t.admin.sermons.delete}
          >
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={t.admin.sermons.title}
        subtitle={t.admin.sermons.subtitle(sermons.length)}
        action={
          <ButtonLink href="/admin/predications/nouvelle">
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {t.admin.sermons.add}
          </ButtonLink>
        }
      />

      <div aria-live="polite">
        {feedback?.tone === "success" && (
          <Alert tone="success" role="status" className="mb-6">
            {t.admin.sermons.deleted(feedback.title)}
          </Alert>
        )}
        {feedback?.tone === "error" && (
          <Alert tone="error" role="alert" className="mb-6">
            {t.form.saveErrors[feedback.code]}
          </Alert>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <label htmlFor="admin-filter" className="sr-only">
            {t.admin.sermons.search}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.75}
          />
          <input
            id="admin-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.admin.sermons.search}
            className={cn(inputStyles, "h-10 pl-9 text-sm")}
          />
        </div>
        {!isAdmin && <p className="text-xs text-ink-muted">{t.admin.sermons.deleteAdminOnly}</p>}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={sermons.length === 0 ? t.admin.overview.empty : t.admin.sermons.empty}
          className="rounded-lg border bg-surface"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          {/* Tableau — tablette et ordinateur */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="border-b border-line bg-paper-deep/50 text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">{t.admin.sermons.columns.sermon}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.admin.sermons.columns.date}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.admin.sermons.statusColumn}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.admin.sermons.columns.audio}</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">{t.admin.sermons.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((sermon) => {
                const duration = getTotalDuration(sermon);
                return (
                  <tr key={sermon.id} className="transition-colors hover:bg-paper/60">
                    <td className="max-w-0 px-5 py-4">
                      <p className="truncate font-medium text-ink">{sermon.title}</p>
                      <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                        {sermon.scriptureReferences.join(" · ")}
                        {sermon.preacher && ` — ${sermon.preacher}`}
                      </p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-ink-soft">
                      <time dateTime={sermon.date}>{formatDate(sermon.date, locale, "short")}</time>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge published={sermon.published} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-ink-soft tabular-nums">
                      {sermon.audioFiles.length}
                      {duration !== null && <span className="text-ink-muted"> · {formatDuration(duration)}</span>}
                    </td>
                    <td className="w-32 px-3 py-4">{actions(sermon)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Liste — mobile */}
          <ul className="divide-y divide-line md:hidden">
            {rows.map((sermon) => (
              <li key={sermon.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink">{sermon.title}</p>
                  <StatusBadge published={sermon.published} className="mt-0.5" />
                </div>
                <p className="mt-0.5 text-[13px] text-ink-muted">{sermon.scriptureReferences.join(" · ")}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[13px] text-ink-soft">
                    <time dateTime={sermon.date}>{formatDate(sermon.date, locale, "short")}</time>
                    <span className="text-ink-muted"> · {t.sermon.recordings(sermon.audioFiles.length)}</span>
                  </p>
                  {actions(sermon)}
                </div>
              </li>
            ))}
          </ul>
        </div>
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
