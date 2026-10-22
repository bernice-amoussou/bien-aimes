"use client";

import { LockKeyhole, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/locale-provider";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { WithPathname } from "./with-pathname";

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

interface NavLink {
  href: string;
  label: string;
}

function DesktopLinks({ links, pathname }: { links: NavLink[]; pathname: string | null }) {
  return (
    <ul className="flex items-center gap-1">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm transition-colors",
                active ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {link.label}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-[13px] h-px bg-forest-700"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MobileLinks({
  links,
  pathname,
  onNavigate,
}: {
  links: NavLink[];
  pathname: string | null;
  onNavigate: () => void;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between py-4 font-display text-2xl",
                active ? "text-forest-700" : "text-ink",
              )}
            >
              {link.label}
              {active && (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-gold-500" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  const links: NavLink[] = [
    { href: "/", label: t.nav.home },
    { href: "/predications", label: t.nav.sermons },
    { href: "/a-propos", label: t.nav.about },
  ];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-forest-700 focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        {t.common.skipToContent}
      </a>
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label={t.nav.primary} className="hidden md:block">
          <WithPathname render={(pathname) => <DesktopLinks links={links} pathname={pathname} />} />
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <Link
            href="/connexion"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <LockKeyhole aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            {t.nav.login}
          </Link>
        </div>

        <button
          type="button"
          className="-mr-2 inline-flex size-10 items-center justify-center rounded-md text-ink md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
          ) : (
            <Menu aria-hidden="true" className="size-5" strokeWidth={1.5} />
          )}
        </button>
      </Container>

      <div
        id={menuId}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-paper md:hidden"
      >
        <Container className="flex min-h-full flex-col py-6">
          <nav aria-label={t.nav.primary}>
            <WithPathname
              render={(pathname) => (
                <MobileLinks links={links} pathname={pathname} onNavigate={() => setOpen(false)} />
              )}
            />
          </nav>
          <div className="mt-auto flex items-center justify-between gap-4 pt-8">
            <LanguageSwitcher />
            <Link
              href="/connexion"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
            >
              <LockKeyhole aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              {t.nav.login}
            </Link>
          </div>
        </Container>
      </div>
    </header>
  );
}
