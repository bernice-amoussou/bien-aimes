"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo, LogoMark } from "@/components/layout/logo";
import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/lib/i18n/locale-provider";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export function LoginView() {
  const { t } = useI18n();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-forest-800 p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <Logo tone="light" />
        <LogoMark
          accent={false}
          className="pointer-events-none absolute -right-28 -bottom-24 size-[34rem] text-white/[0.05]"
        />
        <figure className="relative max-w-md">
          <span aria-hidden="true" className="mb-8 block h-px w-12 bg-gold-400" />
          <blockquote className="font-display text-3xl leading-snug italic">
            « {t.login.quote} »
          </blockquote>
          <figcaption className="mt-5 text-sm text-paper/60">{t.login.quoteRef}</figcaption>
        </figure>
        <p className="relative text-sm text-paper/50">{t.common.tagline}</p>
      </aside>

      <main id="contenu" className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-sm px-1 text-[15px] text-ink-muted hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
            {t.login.backToSite}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <p className="eyebrow text-gold-700">{t.login.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl text-ink">{t.login.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{t.login.subtitle}</p>

          {!isSupabaseConfigured() && (
            <Alert tone="notice" title={t.login.notConfiguredTitle} className="mt-8">
              {t.login.notConfiguredText}
            </Alert>
          )}

          <div className="mt-8">
            <LoginForm />
          </div>
          <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">{t.login.accountsNote}</p>
        </div>
      </main>
    </div>
  );
}
