"use client";

import { ArrowLeft, DatabaseZap, LoaderCircle, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/admin/actions";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-provider";

function StatePage({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <Logo />
        <LanguageSwitcher />
      </div>
      <main id="contenu" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-16">
        {children}
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 self-start text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
          {t.login.backToSite}
        </Link>
      </main>
    </div>
  );
}

function StateIcon({ children }: { children: ReactNode }) {
  return (
    <span className="mb-6 flex size-12 items-center justify-center rounded-full border border-line-strong bg-surface text-gold-700">
      {children}
    </span>
  );
}

export function AdminSetupView() {
  const { t } = useI18n();
  return (
    <StatePage>
      <StateIcon>
        <DatabaseZap aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </StateIcon>
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t.admin.setup.title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{t.admin.setup.text}</p>
      <ol className="mt-6 divide-y divide-line border-y border-line">
        {t.admin.setup.steps.map((step, index) => (
          <li key={step} className="grid grid-cols-[2rem_1fr] gap-2 py-3 text-sm text-ink-soft">
            <span className="font-display text-base text-gold-700 italic tabular-nums">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </StatePage>
  );
}

export function AccessDeniedView({ email }: { email: string }) {
  const { t } = useI18n();
  return (
    <StatePage>
      <StateIcon>
        <ShieldAlert aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </StateIcon>
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t.admin.denied.title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{t.admin.denied.text(email)}</p>
      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="secondary">
          <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t.admin.nav.signOut}
        </Button>
      </form>
    </StatePage>
  );
}

export function AdminLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="…">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-ink-muted" strokeWidth={1.5} />
    </div>
  );
}
