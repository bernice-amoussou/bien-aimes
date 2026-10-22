"use client";

import Link from "next/link";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/lib/i18n/locale-provider";
import { SITE } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  const { t } = useI18n();

  const links = [
    { href: "/predications", label: t.nav.sermons },
    { href: "/a-propos", label: t.nav.about },
    { href: "/connexion", label: t.nav.login },
  ];

  return (
    <footer className="mt-auto bg-paper-deep/60">
      <Container className="flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t.footer.description}</p>
          {SITE.contactEmail && (
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="mt-3 inline-block text-[15px] text-forest-700 underline-offset-4 hover:underline"
            >
              {SITE.contactEmail}
            </a>
          )}
        </div>
        <nav aria-label={t.footer.links}>
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-[15px] text-ink-soft transition-colors hover:text-forest-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container className="pb-8 text-[13px] text-ink-muted">
        <p>{t.footer.copyright(SITE.copyrightYear)}</p>
      </Container>
    </footer>
  );
}
