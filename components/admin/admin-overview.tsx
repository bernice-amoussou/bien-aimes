"use client";

import { ArrowRight, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-provider";
import { AdminSermonRow } from "./admin-sermons-table";
import { useAdmin } from "./admin-store";

export function AdminOverview() {
  const { t } = useI18n();
  const { sermons } = useAdmin();
  const drafts = sermons.filter((s) => !s.published);
  const published = sermons.length - drafts.length;
  const recent = [...sermons]
    .filter((s) => s.published)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 5);

  return (
    <>
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t.admin.overview.title}</h1>
      <p className="mt-1.5 text-[15px] text-ink-muted">{t.admin.overview.summary(published, drafts.length)}</p>

      <ButtonLink href="/admin/predications/nouvelle" size="xl" className="mt-6 w-full sm:w-auto">
        <Plus aria-hidden="true" className="size-5" strokeWidth={2} />
        {t.admin.overview.add}
      </ButtonLink>

      {sermons.length === 0 && (
        <p className="mt-6 rounded-3xl bg-paper-deep/60 px-5 py-6 text-[15px] leading-relaxed text-ink-soft">
          {t.admin.overview.emptyText}
        </p>
      )}

      {drafts.length > 0 && (
        <section aria-labelledby="drafts-title" className="mt-10">
          <h2 id="drafts-title" className="font-display text-2xl text-ink">
            {t.admin.overview.drafts}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t.admin.overview.draftsHint}</p>
          <ul className="mt-2 space-y-1">
            {drafts.map((sermon) => (
              <li key={sermon.id}>
                <AdminSermonRow sermon={sermon} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent-title" className="mt-10">
          <h2 id="recent-title" className="font-display text-2xl text-ink">
            {t.admin.overview.recent}
          </h2>
          <ul className="mt-2 space-y-1">
            {recent.map((sermon) => (
              <li key={sermon.id}>
                <AdminSermonRow sermon={sermon} />
              </li>
            ))}
          </ul>
          <Link
            href="/admin/predications"
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-forest-700 hover:underline"
          >
            {t.admin.overview.viewAll}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </section>
      )}

      <Link
        href="/"
        className="mt-8 flex min-h-11 items-center gap-2 text-[15px] text-ink-muted hover:text-ink md:hidden"
      >
        <ExternalLink aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {t.admin.nav.viewSite}
      </Link>
    </>
  );
}
