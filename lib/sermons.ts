import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEMO_SERMONS } from "@/data/demo-sermons";
import { getBookName, isUuid, sortByDateDesc } from "@/lib/sermon-utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SERMON_SELECT, mapSermonRow, type SermonWithAudioRow } from "@/lib/supabase/mappers";
import { createPublicSupabase } from "@/lib/supabase/public";
import type { Sermon } from "@/types/sermon";

/**
 * Accès public aux prédications.
 *
 * - Supabase configuré : lecture avec le rôle `anon` (RLS → publiées seulement),
 *   mise en cache et invalidée par les Server Actions via le tag `sermons`.
 * - Supabase non configuré : données de démonstration (data/demo-sermons.ts).
 */

export const SERMONS_CACHE_TAG = "sermons";

/** Vrai tant que Supabase n'est pas configuré : le site affiche les exemples. */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export async function getSermons(): Promise<Sermon[]> {
  if (isDemoMode()) return sortByDateDesc(DEMO_SERMONS);
  return fetchPublishedSermons();
}

export async function getSermonById(id: string): Promise<Sermon | null> {
  if (isDemoMode()) return DEMO_SERMONS.find((sermon) => sermon.id === id) ?? null;
  // Un identifiant mal formé provoquerait une erreur PostgreSQL : c'est simplement « introuvable ».
  if (!isUuid(id)) return null;
  return fetchPublishedSermon(id);
}

/**
 * Prédications liées : d'abord celles qui partagent un livre biblique,
 * puis les plus récentes pour compléter.
 */
export async function getRelatedSermons(sermon: Sermon, limit = 3): Promise<Sermon[]> {
  const books = new Set(sermon.scriptureReferences.map(getBookName));
  const others = (await getSermons()).filter((s) => s.id !== sermon.id);
  const sameBook = others.filter((s) =>
    s.scriptureReferences.some((ref) => books.has(getBookName(ref))),
  );
  const rest = others.filter((s) => !sameBook.includes(s));
  return [...sameBook, ...rest].slice(0, limit);
}

async function fetchPublishedSermons(): Promise<Sermon[]> {
  "use cache";
  cacheTag(SERMONS_CACHE_TAG);
  cacheLife("hours");

  const { data, error } = await createPublicSupabase()
    .from("sermons")
    .select(SERMON_SELECT)
    .eq("is_published", true)
    .order("preached_on", { ascending: false });

  if (error) throw new Error(`Lecture des prédications impossible : ${error.message}`);
  return (data as unknown as SermonWithAudioRow[]).map(mapSermonRow);
}

async function fetchPublishedSermon(id: string): Promise<Sermon | null> {
  "use cache";
  cacheTag(SERMONS_CACHE_TAG);
  cacheLife("hours");

  const { data, error } = await createPublicSupabase()
    .from("sermons")
    .select(SERMON_SELECT)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw new Error(`Lecture de la prédication impossible : ${error.message}`);
  return data ? mapSermonRow(data as unknown as SermonWithAudioRow) : null;
}
