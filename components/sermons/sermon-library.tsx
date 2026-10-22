"use client";

import { ArrowDownUp, Library, Search, SearchX, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SEARCH_INPUT_ID } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatMonthName } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import {
  EMPTY_FILTERS,
  filterSermons,
  getAvailableLanguages,
  getAvailableMonths,
  getAvailableYears,
  type SermonFilters,
} from "@/lib/sermon-utils";
import type { Sermon, SermonLanguage } from "@/types/sermon";
import { SermonList } from "./sermon-list-item";

const PAGE_SIZE = 10;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full border px-4 text-[15px] whitespace-nowrap transition-colors",
        active
          ? "border-forest-700 bg-forest-700 text-paper"
          : "border-line-strong bg-surface text-ink-soft hover:border-ink-muted/60 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Rangée de pastilles : défilement horizontal sur mobile, retour à la ligne sur ordinateur. */
function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {children}
    </div>
  );
}

/** Bibliothèque : recherche, filtres simples et liste. Lit `?q=` envoyé depuis l'accueil. */
export function SermonLibraryWithQuery({ sermons }: { sermons: Sermon[] }) {
  return (
    <Suspense fallback={<SermonLibrary sermons={sermons} initialQuery="" />}>
      <QueryReader sermons={sermons} />
    </Suspense>
  );
}

function QueryReader({ sermons }: { sermons: Sermon[] }) {
  const query = useSearchParams().get("q") ?? "";
  return <SermonLibrary key={query} sermons={sermons} initialQuery={query} />;
}

function SermonLibrary({ sermons, initialQuery }: { sermons: Sermon[]; initialQuery: string }) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<SermonFilters>({ ...EMPTY_FILTERS, query: initialQuery });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Arrivée par l'onglet « Rechercher » : le curseur est placé dans le champ.
  useEffect(() => {
    if (window.location.hash === `#${SEARCH_INPUT_ID}`) inputRef.current?.focus();
  }, []);

  const years = useMemo(() => getAvailableYears(sermons), [sermons]);
  const months = useMemo(() => getAvailableMonths(sermons, filters.year), [sermons, filters.year]);
  // Le filtre de langue n'apparaît que si l'archive contient plusieurs langues.
  const languages = useMemo(() => getAvailableLanguages(sermons), [sermons]);
  const results = useMemo(() => filterSermons(sermons, filters), [sermons, filters]);
  const visible = results.slice(0, visibleCount);

  const hasActiveFilters =
    filters.query.trim() !== "" || filters.year !== "" || filters.month !== "" || filters.language !== "";

  function update(patch: Partial<SermonFilters>) {
    setFilters((current) => {
      const next = { ...current, ...patch };
      // Le mois n'a de sens qu'à l'intérieur de l'année choisie.
      if (patch.year !== undefined) next.month = "";
      return next;
    });
    setVisibleCount(PAGE_SIZE);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setVisibleCount(PAGE_SIZE);
  }

  if (sermons.length === 0) {
    return (
      <>
        <h1 className="mb-6 font-display text-3xl text-ink sm:text-4xl">{t.library.title}</h1>
        <EmptyState icon={Library} title={t.library.archiveEmpty}>
          {t.library.archiveEmptyText}
        </EmptyState>
      </>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{t.library.title}</h1>

      <search className="mt-4 block space-y-3">
        <div className="relative">
          <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
            {t.library.searchLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.75}
          />
          <input
            ref={inputRef}
            id={SEARCH_INPUT_ID}
            type="search"
            enterKeyHint="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder={t.library.searchPlaceholder}
            autoComplete="off"
            className="h-14 w-full scroll-mt-24 rounded-full border border-line-strong bg-surface pr-14 pl-12 text-base text-ink placeholder:text-ink-muted focus:border-forest-500 focus:ring-3 focus:ring-forest-500/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => {
                update({ query: "" });
                inputRef.current?.focus();
              }}
              aria-label={t.library.clearSearch}
              className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-paper-deep hover:text-ink"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {years.length > 1 && (
          <ChipRow label={t.library.yearFilter}>
            <Chip active={filters.year === ""} onClick={() => update({ year: "" })}>
              {t.library.allYears}
            </Chip>
            {years.map((year) => (
              <Chip key={year} active={filters.year === year} onClick={() => update({ year })}>
                {year}
              </Chip>
            ))}
          </ChipRow>
        )}

        {filters.year !== "" && months.length > 1 && (
          <ChipRow label={t.library.monthFilter}>
            <Chip active={filters.month === ""} onClick={() => update({ month: "" })}>
              {t.library.allMonths}
            </Chip>
            {months.map((month) => (
              <Chip key={month} active={filters.month === month} onClick={() => update({ month })}>
                {formatMonthName(month, locale)}
              </Chip>
            ))}
          </ChipRow>
        )}

        {languages.length > 1 && (
          <ChipRow label={t.library.languageFilter}>
            <Chip active={filters.language === ""} onClick={() => update({ language: "" })}>
              {t.library.allLanguages}
            </Chip>
            {languages.map((code) => (
              <Chip key={code} active={filters.language === code} onClick={() => update({ language: code })}>
                {t.sermon.languageNames[code as SermonLanguage]}
              </Chip>
            ))}
          </ChipRow>
        )}
      </search>

      <div className="mt-5 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p aria-live="polite" className="text-[15px] font-medium text-ink">
          {t.library.results(results.length)}
        </p>
        <div className="-mr-2 flex items-center">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t.library.clearFilters}
            </Button>
          )}
          {results.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ sort: filters.sort === "desc" ? "asc" : "desc" })}
              aria-label={`${t.library.sortLabel} : ${filters.sort === "desc" ? t.library.newest : t.library.oldest}`}
            >
              <ArrowDownUp aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {filters.sort === "desc" ? t.library.newest : t.library.oldest}
            </Button>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t.library.emptyTitle}
          className="mt-2"
          action={
            <Button variant="secondary" size="lg" onClick={clearFilters}>
              {t.library.clearFilters}
            </Button>
          }
        >
          {t.library.emptyText}
        </EmptyState>
      ) : (
        <>
          <div className="mt-1">
            <SermonList sermons={visible} headingLevel="h2" />
          </div>
          {visible.length < results.length && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              >
                {t.library.loadMore}
              </Button>
              <p className="text-[13px] text-ink-muted">{t.library.showing(visible.length, results.length)}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
