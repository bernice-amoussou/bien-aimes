"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { TeamMemberRow } from "@/lib/supabase/database.types";
import { AdminPageHeader } from "./admin-shell";
import { useAdmin } from "./admin-store";

export function CollaboratorsView({ members }: { members: TeamMemberRow[] }) {
  const { t, locale } = useI18n();
  const { member: me, isAdmin } = useAdmin();
  const c = t.admin.collaborators;

  return (
    <>
      <AdminPageHeader title={c.title} subtitle={c.subtitle} />

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-paper-deep/50 text-xs text-ink-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">{c.columns.email}</th>
              <th scope="col" className="px-5 py-3 font-medium">{c.columns.role}</th>
              <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">{c.columns.since}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((row) => {
              const RoleIcon = row.role === "admin" ? ShieldCheck : UserRound;
              return (
                <tr key={row.user_id}>
                  <td className="max-w-0 px-5 py-4">
                    <p className="truncate text-ink">
                      {row.email ?? row.user_id}
                      {row.user_id === me.id && <span className="ml-2 text-xs text-ink-muted">({c.you})</span>}
                    </p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-ink-soft">
                      <RoleIcon aria-hidden="true" className="size-3.5 text-gold-700" strokeWidth={1.75} />
                      {t.admin.roles[row.role]}
                    </span>
                  </td>
                  <td className="hidden px-5 py-4 whitespace-nowrap text-ink-muted sm:table-cell">
                    {formatDate(row.created_at.slice(0, 10), locale, "short")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!isAdmin && <p className="mt-3 text-xs text-ink-muted">{c.memberNotice}</p>}

      <section aria-labelledby="roles-title" className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 id="roles-title" className="font-display text-2xl text-ink">
            {c.rolesTitle}
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {c.rolesText.map((line) => (
              <li key={line} className="py-3 text-sm leading-relaxed text-ink-soft">
                {line}
              </li>
            ))}
          </ul>
        </div>
        {isAdmin && (
          <Alert tone="info" className="self-start">
            {c.howToAdd}
          </Alert>
        )}
      </section>
    </>
  );
}
