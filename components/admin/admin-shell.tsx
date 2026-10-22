"use client";

import {
  ExternalLink,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Plus,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { WithPathname } from "@/components/layout/with-pathname";
import { signOutAction } from "@/app/admin/actions";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAdmin } from "./admin-store";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  badge?: string;
}

function AdminNavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = pathname !== null && item.isActive(pathname);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-forest-50 font-medium text-forest-800"
                  : "text-ink-soft hover:bg-paper-deep hover:text-ink",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("size-4", active ? "text-forest-700" : "text-ink-muted")}
                strokeWidth={1.75}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-sm bg-sand-200 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-gold-700 uppercase">
                  {item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function AdminNav(props: { items: NavItem[]; onNavigate?: () => void }) {
  return <WithPathname render={(pathname) => <AdminNavList {...props} pathname={pathname} />} />;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { member } = useAdmin();
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  const items: NavItem[] = [
    {
      href: "/admin",
      label: t.admin.nav.overview,
      icon: LayoutDashboard,
      isActive: (p) => p === "/admin",
    },
    {
      href: "/admin/predications",
      label: t.admin.nav.sermons,
      icon: Library,
      isActive: (p) => p.startsWith("/admin/predications") && !p.endsWith("/nouvelle"),
    },
    {
      href: "/admin/predications/nouvelle",
      label: t.admin.nav.newSermon,
      icon: Plus,
      isActive: (p) => p === "/admin/predications/nouvelle",
    },
    {
      href: "/admin/collaborateurs",
      label: t.admin.nav.collaborators,
      icon: UsersRound,
      isActive: (p) => p.startsWith("/admin/collaborateurs"),
    },
  ];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const footer = (
    <div className="space-y-4 border-t border-line pt-4">
      <div className="px-3">
        <p className="truncate text-sm font-medium text-ink" title={member.email ?? undefined}>
          {member.email}
        </p>
        <p className="text-xs text-ink-muted">{t.admin.roles[member.role]}</p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <LogOut aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
          {t.admin.nav.signOut}
        </button>
      </form>
      <Link
        href="/"
        className="flex items-center gap-2 px-3 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
        {t.admin.nav.viewSite}
      </Link>
      <div className="px-3">
        <LanguageSwitcher />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Barre latérale — ordinateur */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-6 lg:flex">
        <div className="px-3">
          <Logo href="/admin" />
        </div>
        <nav aria-label={t.admin.nav.label} className="mt-10 flex-1">
          <AdminNav items={items} />
        </nav>
        {footer}
      </aside>

      {/* Barre supérieure — mobile et tablette */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Logo href="/admin" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={drawerId}
          className="-mr-2 inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm text-ink-soft"
        >
          <Menu aria-hidden="true" className="size-5" strokeWidth={1.5} />
          {t.admin.nav.menu}
        </button>
      </div>

      <div id={drawerId} hidden={!open} className="fixed inset-0 z-40 lg:hidden">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-ink/30"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.admin.nav.label}
          className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface px-3 py-4 shadow-lift"
        >
          <div className="flex items-center justify-between px-3">
            <Logo href="/admin" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.nav.closeMenu}
              className="-mr-2 inline-flex size-10 items-center justify-center rounded-md text-ink-soft"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
            </button>
          </div>
          <nav aria-label={t.admin.nav.label} className="mt-8 flex-1">
            <AdminNav items={items} onNavigate={() => setOpen(false)} />
          </nav>
          {footer}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <main id="contenu" className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
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
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
