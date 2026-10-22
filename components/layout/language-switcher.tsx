"use client";

import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/cn";

const LANGUAGE_NAMES: Record<Locale, string> = { fr: "français", en: "English" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-surface p-0.5 text-[13px] font-medium",
        className,
      )}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            aria-label={t.nav.switchTo(LANGUAGE_NAMES[code])}
            onClick={() => setLocale(code)}
            className={cn(
              "h-9 min-w-11 rounded-full px-2.5 uppercase tracking-wide transition-colors",
              active ? "bg-forest-700 text-paper" : "text-ink-muted hover:text-ink",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
