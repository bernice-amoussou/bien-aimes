"use client";

import { ExternalLink, House, Library, LogOut, Plus, UsersRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/admin/actions";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { TabBar, type TabItem } from "@/components/layout/tab-bar";
import { WithPathname } from "@/components/layout/with-pathname";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAdmin } from "./admin-store";

const NEW_HREF = "/admin/predications/nouvelle";

/** Pages de saisie : la barre d'onglets laisse la place aux boutons du formulaire. */
function isEditorPath(pathname: string) {
  return pathname === NEW_HREF || pathname.endsWith("/modifier");
}

function SidebarNav({ items, pathname }: { items: TabItem[]; pathname: string | null }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = pathname !== null && item.isActive(pathname);
        const Icon: LucideIcon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
                item.prominent
                  ? "mb-4 justify-center bg-forest-700 font-medium text-paper hover:bg-forest-800"
                  : active
                    ? "bg-forest-50 font-medium text-forest-800"
                    : "text-ink-soft hover:bg-paper-deep hover:text-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        aria-label={compact ? t.admin.nav.signOut : undefined}
        title={compact ? t.admin.nav.signOut : undefined}
        className={cn(
          "flex items-center gap-2 rounded-xl text-[15px] text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink",
          compact ? "size-11 justify-center" : "min-h-11 w-full px-3",
        )}
      >
        <LogOut aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {!compact && t.admin.nav.signOut}
      </button>
    </form>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { member } = useAdmin();

  const items: TabItem[] = [
    { href: "/admin", label: t.admin.nav.home, icon: House, isActive: (p) => p === "/admin" },
    {
      href: "/admin/predications",
      label: t.admin.nav.sermons,
      icon: Library,
      isActive: (p) => p.startsWith("/admin/predications") && p !== NEW_HREF,
    },
    { href: NEW_HREF, label: t.admin.nav.add, icon: Plus, isActive: (p) => p === NEW_HREF, prominent: true },
    {
      href: "/admin/collaborateurs",
      label: t.admin.nav.team,
      icon: UsersRound,
      isActive: (p) => p.startsWith("/admin/collaborateurs"),
    },
  ];
  // Sur ordinateur, « Ajouter » est le bouton principal en tête de la barre latérale.
  const sidebarItems = [items[2], items[0], items[1], items[3]];

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Barre latérale — tablette et ordinateur */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-6 md:flex">
        <div className="px-3">
          <Logo href="/admin" />
        </div>
        <nav aria-label={t.admin.nav.label} className="mt-8 flex-1">
          <WithPathname render={(pathname) => <SidebarNav items={sidebarItems} pathname={pathname} />} />
        </nav>
        <div className="space-y-2 border-t border-line pt-4">
          <div className="px-3 pb-1">
            <p className="truncate text-sm font-medium text-ink" title={member.email ?? undefined}>
              {member.email}
            </p>
            <p className="text-[13px] text-ink-muted">{t.admin.roles[member.role]}</p>
          </div>
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
          >
            <ExternalLink aria-hidden="true" className="size-5" strokeWidth={1.75} />
            {t.admin.nav.viewSite}
          </Link>
          <SignOutButton />
          <div className="px-3 pt-1">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      {/* Barre supérieure — mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur md:hidden">
        <Logo href="/admin" />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <SignOutButton compact />
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main id="contenu" className="flex-1 px-4 py-5 sm:px-8 md:py-10 lg:px-12">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>

      <WithPathname
        render={(pathname) =>
          pathname && isEditorPath(pathname) ? null : <TabBar items={items} label={t.admin.nav.label} />
        }
      />
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
