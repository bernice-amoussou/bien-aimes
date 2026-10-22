"use client";

import Link from "next/link";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/lib/i18n/locale-provider";
import { SITE } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "./logo";

export function SiteFooter() {
  const { t } = useI18n();

  const groups = [
    {
      title: t.footer.explore,
      links: [
        { href: "/", label: t.nav.home },
        { href: "/predications", label: t.nav.sermons },
        { href: "/a-propos", label: t.nav.about },
      ],
    },
    {
      title: t.footer.team,
      links: [
        { href: "/connexion", label: t.nav.login },
        { href: "/admin", label: t.footer.dashboard },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-line bg-paper-deep/60">
      <Container className="grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 font-display text-lg text-ink-soft italic">{t.common.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t.footer.description}</p>
          {SITE.contactEmail && (
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="mt-4 inline-block text-sm text-forest-700 underline-offset-4 hover:underline"
            >
              {SITE.contactEmail}
            </a>
          )}
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="eyebrow text-ink-muted">{group.title}</p>
            <ul className="mt-4 space-y-2.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-soft transition-colors hover:text-forest-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.copyright(SITE.copyrightYear)}</p>
          {!isSupabaseConfigured() && <p>{t.footer.demoNotice}</p>}
        </Container>
      </div>
    </footer>
  );
}
