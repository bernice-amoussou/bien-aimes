"use client";

import { ArrowRight, Library, Plus } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import { getSermonStats } from "@/lib/sermon-utils";
import { AdminPageHeader } from "./admin-shell";
import { useAdmin } from "./admin-store";
import { StatusBadge } from "./status-badge";

export function AdminOverview() {
  const { t, locale } = useI18n();
  const { sermons } = useAdmin();
  const stats = getSermonStats(sermons);
  const recent = [...sermons]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 5);

  const figures = [
    { label: t.admin.overview.sermons, value: String(stats.sermonCount), hint: t.admin.overview.sermonsHint(stats.publishedCount, stats.sermonCount - stats.publishedCount) },
    { label: t.admin.overview.audioFiles, value: String(stats.audioFileCount), hint: t.admin.overview.filesHint },
    {
      label: t.admin.overview.totalDuration,
      value: stats.totalDuration > 0 ? formatDuration(stats.totalDuration) : "—",
      hint: t.admin.overview.durationHint(stats.filesWithoutDuration),
    },
    { label: t.admin.overview.withoutAudio, value: String(stats.sermonsWithoutAudio), hint: t.admin.overview.withoutAudioHint },
  ];

  return (
    <>
      <AdminPageHeader
        title={t.admin.overview.title}
        subtitle={t.admin.overview.subtitle}
        action={
          <ButtonLink href="/admin/predications/nouvelle">
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {t.admin.overview.add}
          </ButtonLink>
        }
      />

      <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-4">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={[
              "p-5 sm:p-6",
              index % 2 === 1 ? "border-l border-line" : "",
              index >= 2 ? "border-t border-line lg:border-t-0" : "",
              index === 2 ? "lg:border-l" : "",
            ].join(" ")}
          >
            <dt className="text-[13px] text-ink-muted">{figure.label}</dt>
            <dd className="mt-2 font-display text-4xl leading-none text-ink tabular-nums">{figure.value}</dd>
            <dd className="mt-3 text-xs text-ink-muted">{figure.hint}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="recent-title" className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="recent-title" className="font-display text-2xl text-ink">
            {t.admin.overview.recent}
          </h2>
          <Link
            href="/admin/predications"
            className="inline-flex items-center gap-1.5 text-sm text-forest-700 hover:underline"
          >
            {t.admin.overview.viewAll}
            <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={Library}
            title={t.admin.sermons.empty}
            className="rounded-lg border bg-surface"
            action={
              <ButtonLink href="/admin/predications/nouvelle">
                <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                {t.admin.overview.add}
              </ButtonLink>
            }
          />
        ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {recent.map((sermon) => (
            <li key={sermon.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/predications/${sermon.id}/modifier`}
                    className="truncate font-medium text-ink hover:text-forest-700"
                  >
                    {sermon.title}
                  </Link>
                  {!sermon.published && <StatusBadge published={false} />}
                </div>
                <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                  {sermon.scriptureReferences.join(" · ")}
                </p>
              </div>
              <div className="shrink-0 text-right text-[13px]">
                <time dateTime={sermon.date} className="block text-ink-soft">
                  {formatDate(sermon.date, locale, "short")}
                </time>
                <span className="text-ink-muted">{t.sermon.recordings(sermon.audioFiles.length)}</span>
              </div>
            </li>
          ))}
        </ul>
        )}
      </section>
    </>
  );
}
