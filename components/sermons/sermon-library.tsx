"use client";

import { Library, Search, SearchX, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { formatMonthName } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";
import {
  EMPTY_FILTERS,
  filterSermons,
  getAvailableLanguages,
  getAvailableMonths,
  getAvailableYears,
  type SermonFilters,
  type SortOrder,
} from "@/lib/sermon-utils";
import type { Sermon, SermonLanguage } from "@/types/sermon";
import { SermonList } from "./sermon-list-item";

const PAGE_SIZE = 8;

export function SermonLibrary({ sermons }: { sermons: Sermon[] }) {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<SermonFilters>(EMPTY_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const ids = {
    search: useId(),
    year: useId(),
    month: useId(),
    language: useId(),
    sort: useId(),
  };

  const years = useMemo(() => getAvailableYears(sermons), [sermons]);
  const months = useMemo(() => getAvailableMonths(sermons, filters.year), [sermons, filters.year]);
  // Le filtre de langue n'apparaît que si l'archive contient plusieurs langues.
  const languages = useMemo(() => getAvailableLanguages(sermons), [sermons]);
  const results = useMemo(() => filterSermons(sermons, filters), [sermons, filters]);
  const visible = results.slice(0, visibleCount);

  const hasActiveFilters =
    filters.query.trim() !== "" ||
    filters.year !== "" ||
    filters.month !== "" ||
    filters.language !== "" ||
    filters.sort !== "desc";

  function update(patch: Partial<SermonFilters>) {
    setFilters((current) => {
      const next = { ...current, ...patch };
      // Un mois sans prédication pour l'année choisie n'a plus de sens.
      if (patch.year !== undefined && next.month && !getAvailableMonths(sermons, next.year).includes(next.month)) {
        next.month = "";
      }
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
      <EmptyState icon={Library} title={t.library.archiveEmpty}>
        {t.library.archiveEmptyText}
      </EmptyState>
    );
  }

  return (
    <div>
      <search className="block border-b border-line pb-6">
        <div className="relative">
          <label htmlFor={ids.search} className="sr-only">
            {t.library.searchLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.5}
          />
          <input
            id={ids.search}
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder={t.library.searchPlaceholder}
            autoComplete="off"
            className="h-14 w-full rounded-md border border-line-strong bg-surface pr-12 pl-12 text-base text-ink placeholder:text-ink-muted/70 focus:border-forest-500 focus:ring-3 focus:ring-forest-500/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => update({ query: "" })}
              aria-label={t.library.clearSearch}
              className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-paper-deep hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="sm:w-44">
            <label htmlFor={ids.year} className="mb-1 block text-xs font-medium text-ink-muted">
              {t.library.yearLabel}
            </label>
            <Select id={ids.year} value={filters.year} onChange={(e) => update({ year: e.target.value })}>
              <option value="">{t.library.allYears}</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <label htmlFor={ids.month} className="mb-1 block text-xs font-medium text-ink-muted">
              {t.library.monthLabel}
            </label>
            <Select id={ids.month} value={filters.month} onChange={(e) => update({ month: e.target.value })}>
              <option value="">{t.library.allMonths}</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonthName(month, locale)}
                </option>
              ))}
            </Select>
          </div>
          {languages.length > 1 && (
            <div className="sm:w-44">
              <label htmlFor={ids.language} className="mb-1 block text-xs font-medium text-ink-muted">
                {t.library.languageLabel}
              </label>
              <Select
                id={ids.language}
                value={filters.language}
                onChange={(e) => update({ language: e.target.value })}
              >
                <option value="">{t.library.allLanguages}</option>
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {t.sermon.languageNames[code as SermonLanguage]}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="col-span-2 sm:ml-auto sm:w-56">
            <label htmlFor={ids.sort} className="mb-1 block text-xs font-medium text-ink-muted">
              {t.library.sortLabel}
            </label>
            <Select
              id={ids.sort}
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as SortOrder })}
            >
              <option value="desc">{t.library.newest}</option>
              <option value="asc">{t.library.oldest}</option>
            </Select>
          </div>
        </div>
      </search>

      <div className="flex min-h-14 items-center justify-between gap-4 py-4">
        <p aria-live="polite" className="text-sm text-ink-soft">
          <span className="font-medium text-ink">{t.library.results(results.length)}</span>
        </p>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            {t.library.clearFilters}
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t.library.emptyTitle}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              {t.library.clearFilters}
            </Button>
          }
        >
          {t.library.emptyText}
        </EmptyState>
      ) : (
        <>
          <SermonList sermons={visible} headingLevel="h2" />
          {visible.length < results.length && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-xs text-ink-muted">
                {t.library.showing(visible.length, results.length)}
              </p>
              <Button variant="secondary" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                {t.library.loadMore}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
