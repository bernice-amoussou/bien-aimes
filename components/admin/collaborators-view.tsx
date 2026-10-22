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

      <ul className="space-y-1">
        {members.map((row) => {
          const RoleIcon = row.role === "admin" ? ShieldCheck : UserRound;
          return (
            <li key={row.user_id} className="-mx-3 flex items-center gap-3 rounded-2xl px-3 py-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper-deep text-gold-700">
                <RoleIcon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">
                  {row.email ?? row.user_id}
                  {row.user_id === me.id && <span className="ml-2 text-sm font-normal text-ink-muted">({c.you})</span>}
                </p>
                <p className="text-sm text-ink-muted">
                  {t.admin.roles[row.role]} · {c.since(formatDate(row.created_at.slice(0, 10), locale, "short"))}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {!isAdmin && <p className="mt-3 text-sm text-ink-muted">{c.memberNotice}</p>}

      <section aria-labelledby="roles-title" className="mt-10">
        <h2 id="roles-title" className="font-display text-2xl text-ink">
          {c.rolesTitle}
        </h2>
        <ul className="mt-3 space-y-3">
          {c.rolesText.map((line) => (
            <li key={line} className="text-[15px] leading-relaxed text-ink-soft">
              {line}
            </li>
          ))}
        </ul>
        {isAdmin && (
          <Alert tone="info" className="mt-6">
            {c.howToAdd}
          </Alert>
        )}
      </section>
    </>
  );
}
