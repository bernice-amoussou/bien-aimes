import type { Sermon } from "@/types/sermon";

/**
 * Fonctions pures sur les prédications, sans dépendance aux données :
 * utilisables côté serveur comme côté client.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** UUID v4 ; n'exige pas de contexte sécurisé, contrairement à crypto.randomUUID. */
export function createUuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Une date ISO `YYYY-MM-DD` qui existe réellement au calendrier. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export const SERMON_TITLE_MAX = 160;

export function sortByDateDesc(sermons: Sermon[]): Sermon[] {
  return [...sermons].sort((a, b) => b.date.localeCompare(a.date));
}

/** "1 Corinthiens 13:1-13" → "1 Corinthiens" */
export function getBookName(reference: string): string {
  return reference.replace(/\s+\d+([:.,]\d.*)?$/, "").trim();
}

/* ─── Recherche et filtres (purs, utilisables côté client) ─── */

export type SortOrder = "desc" | "asc";

export interface SermonFilters {
  query: string;
  year: string; // "" = toutes
  month: string; // "" = tous, sinon "01" … "12"
  language: string; // "" = toutes, sinon "fr" | "en"
  sort: SortOrder;
}

export const EMPTY_FILTERS: SermonFilters = {
  query: "",
  year: "",
  month: "",
  language: "",
  sort: "desc",
};

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function filterSermons(
  sermons: Sermon[],
  filters: SermonFilters,
): Sermon[] {
  const terms = normalizeText(filters.query).split(/\s+/).filter(Boolean);

  const filtered = sermons.filter((sermon) => {
    if (filters.year && !sermon.date.startsWith(filters.year)) return false;
    if (filters.month && sermon.date.slice(5, 7) !== filters.month) return false;
    if (filters.language && sermon.language !== filters.language) return false;
    if (terms.length === 0) return true;

    const haystack = normalizeText(
      [sermon.title, ...sermon.scriptureReferences].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });

  return filters.sort === "asc"
    ? filtered.sort((a, b) => a.date.localeCompare(b.date))
    : filtered.sort((a, b) => b.date.localeCompare(a.date));
}

export function getAvailableYears(sermons: Sermon[]): string[] {
  return [...new Set(sermons.map((s) => s.date.slice(0, 4)))].sort().reverse();
}

export function getAvailableMonths(sermons: Sermon[], year: string): string[] {
  return [
    ...new Set(
      sermons
        .filter((s) => !year || s.date.startsWith(year))
        .map((s) => s.date.slice(5, 7)),
    ),
  ].sort();
}

/** Durée totale connue d'une prédication, `null` si aucune durée n'est connue. */
export function getTotalDuration(sermon: Sermon): number | null {
  const known = sermon.audioFiles
    .map((file) => file.duration)
    .filter((d): d is number => d !== null);
  return known.length > 0 ? known.reduce((sum, d) => sum + d, 0) : null;
}

export function getAvailableLanguages(sermons: Sermon[]): string[] {
  return [...new Set(sermons.map((s) => s.language))].sort();
}
