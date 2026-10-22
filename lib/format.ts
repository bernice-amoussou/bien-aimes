import type { Locale } from "@/lib/i18n/config";

const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

/** Les dates ISO `YYYY-MM-DD` sont interprétées en UTC pour éviter tout décalage de fuseau. */
function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function formatDate(
  iso: string,
  locale: Locale,
  style: "long" | "short" = "long",
): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDate(iso));
}

export function formatDateParts(iso: string, locale: Locale) {
  const date = parseIsoDate(iso);
  const fmt = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      ...options,
      timeZone: "UTC",
    }).format(date);
  return {
    day: fmt({ day: "2-digit" }),
    month: fmt({ month: "short" }).replace(".", ""),
    year: fmt({ year: "numeric" }),
  };
}

export function formatMonthName(month: string, locale: Locale): string {
  const name = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, Number(month) - 1, 15)));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** 2874 → "47 min" ; 3720 → "1 h 02" */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${Math.max(totalMinutes, 1)} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${String(minutes).padStart(2, "0")}`;
}

/** Affichage horloge pour les lecteurs : 75 → "1:15", 3725 → "1:02:05" */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function formatFileSize(bytes: number, locale: Locale): string {
  const units = locale === "fr" ? ["o", "Ko", "Mo", "Go"] : ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(INTL_LOCALE[locale], {
    maximumFractionDigits: unit >= 2 ? 1 : 0,
  }).format(value);
  return `${formatted} ${units[unit]}`;
}
