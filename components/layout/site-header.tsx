"use client";

// « Info » sert à l'onglet « À propos », désactivé : le réimporter pour le rétablir.
import { Headphones, House, LockKeyhole, Search } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/locale-provider";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { TabBar, type TabItem } from "./tab-bar";
import { WithPathname } from "./with-pathname";

export const SEARCH_INPUT_ID = "recherche";

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function DesktopLinks({ links, pathname }: { links: { href: string; label: string }[]; pathname: string | null }) {
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
                "rounded-full px-4 py-2 text-[15px] transition-colors",
                active ? "bg-forest-50 font-medium text-forest-800" : "text-ink-soft hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** En-tête compact : logo et langue sur mobile (la navigation est en bas), liens complets sur ordinateur. */
export function SiteHeader() {
  const { t } = useI18n();

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/predications", label: t.nav.sermons },
    // Section « À propos » désactivée (décommenter pour la rétablir) :
    // { href: "/a-propos", label: t.nav.about },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-md supports-backdrop-filter:bg-paper/80">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-forest-700 focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        {t.common.skipToContent}
      </a>
      <Container className="flex h-14 items-center justify-between gap-4 md:h-16">
        <Logo />

        <nav aria-label={t.nav.primary} className="hidden md:block">
          <WithPathname render={(pathname) => <DesktopLinks links={links} pathname={pathname} />} />
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/connexion"
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink md:inline-flex"
          >
            <LockKeyhole aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            {t.nav.login}
          </Link>
        </div>
      </Container>
    </header>
  );
}

/** Onglets du site public sur mobile. */
export function SiteTabBar() {
  const { t } = useI18n();

  const items: TabItem[] = [
    { href: "/", label: t.nav.home, icon: House, isActive: (p) => p === "/" },
    {
      href: "/predications",
      label: t.nav.sermons,
      icon: Headphones,
      isActive: (p) => p.startsWith("/predications"),
    },
    {
      href: `/predications#${SEARCH_INPUT_ID}`,
      label: t.nav.search,
      icon: Search,
      isActive: () => false,
      onClick: (event, pathname) => {
        // Déjà sur la liste : on place directement le curseur dans la recherche.
        const input = document.getElementById(SEARCH_INPUT_ID);
        if (pathname === "/predications" && input) {
          event.preventDefault();
          input.scrollIntoView({ block: "center" });
          input.focus();
        }
      },
    },
    // Section « À propos » désactivée (décommenter, et réimporter Info, pour la rétablir) :
    // { href: "/a-propos", label: t.nav.about, icon: Info, isActive: (p) => p.startsWith("/a-propos") },
  ];

  return <TabBar items={items} label={t.nav.primary} />;
}
