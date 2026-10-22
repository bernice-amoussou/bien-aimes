"use client";

import { ArrowLeft, LoaderCircle, LockKeyhole, LogOut, ShieldAlert } from "lucide-react";
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
          className="mt-10 inline-flex min-h-11 items-center gap-2 self-start text-[15px] text-ink-muted hover:text-ink"
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
        <LockKeyhole aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </StateIcon>
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t.admin.setup.title}</h1>
      <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{t.admin.setup.text}</p>
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
      <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">{t.admin.denied.text(email)}</p>
      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="secondary" size="lg">
          <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t.admin.nav.signOut}
        </Button>
      </form>
    </StatePage>
  );
}

export function AdminLoading() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3" role="status">
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-forest-700" strokeWidth={1.75} />
      <span className="text-[15px] text-ink-muted">{t.common.loading}</span>
    </div>
  );
}
