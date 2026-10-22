"use client";

import { Headphones, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/lib/i18n/locale-provider";

/** Accueil : une phrase, une action principale et la recherche. */
export function Hero() {
  const { t } = useI18n();
  const router = useRouter();
  const searchId = useId();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/predications?q=${encodeURIComponent(q)}` : "/predications");
  }

  return (
    <section className="bg-sand-100/70">
      <Container className="py-8 sm:py-14">
        <h1 className="max-w-2xl font-display text-[2.1rem] leading-[1.1] text-ink sm:text-5xl">
          {t.home.title}
        </h1>
        <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-ink-soft">{t.home.subtitle}</p>

        <ButtonLink href="/predications" size="xl" className="mt-6 w-full sm:w-auto">
          <Headphones aria-hidden="true" className="size-5" strokeWidth={2} />
          {t.home.listenCta}
        </ButtonLink>

        <search className="mt-6 block max-w-xl">
          <form onSubmit={handleSearch} className="relative">
            <label htmlFor={searchId} className="sr-only">
              {t.home.searchLabel}
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
              strokeWidth={1.75}
            />
            <input
              id={searchId}
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.home.searchPlaceholder}
              autoComplete="off"
              className="h-14 w-full rounded-full border border-line-strong bg-surface pr-28 pl-12 text-base text-ink placeholder:text-ink-muted focus:border-forest-500 focus:ring-3 focus:ring-forest-500/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-1.5 h-11 -translate-y-1/2 rounded-full bg-forest-50 px-4 text-[15px] font-medium text-forest-800 transition-colors hover:bg-forest-100"
            >
              {t.home.searchSubmit}
            </button>
          </form>
        </search>
      </Container>
    </section>
  );
}
