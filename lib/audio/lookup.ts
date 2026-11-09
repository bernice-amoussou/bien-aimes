import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { SERMONS_CACHE_TAG } from "@/lib/sermons";
import type { AudioFileRow } from "@/lib/supabase/database.types";
import { createPublicSupabase } from "@/lib/supabase/public";
import { createServerSupabase } from "@/lib/supabase/server";

export type AudioLookupRow = Pick<
  AudioFileRow,
  "id" | "name" | "format" | "mime_type" | "storage_path" | "storage_provider" | "is_downloadable"
>;

const BASE_SELECT = "id, name, format, mime_type, storage_path, is_downloadable";

type QueryClient = ReturnType<typeof createPublicSupabase>;
type QueryResult = { data: AudioLookupRow | null; error: PostgrestError | null };

/**
 * Lit un fichier audio. Si la base n'a pas encore reçu la mise à jour SQL
 * (colonne `storage_provider` absente, code 42703), tous les fichiers sont
 * forcément dans l'ancien bucket Supabase.
 */
async function selectAudio(client: QueryClient, id: string): Promise<QueryResult> {
  const result = await client
    .from("audio_files")
    .select(`${BASE_SELECT}, storage_provider`)
    .eq("id", id)
    .maybeSingle();
  if (result.error?.code !== "42703") return result as QueryResult;

  const legacy = await client.from("audio_files").select(BASE_SELECT).eq("id", id).maybeSingle();
  return {
    data: legacy.data ? { ...(legacy.data as Omit<AudioLookupRow, "storage_provider">), storage_provider: "supabase" } : null,
    error: legacy.error,
  };
}

/**
 * Fichier d'une prédication PUBLIÉE (rôle `anon` : RLS écarte les brouillons).
 * Mis en cache et invalidé à chaque modification des prédications.
 */
export async function getPublishedAudio(id: string): Promise<AudioLookupRow | null> {
  "use cache";
  cacheTag(SERMONS_CACHE_TAG);
  cacheLife("hours");

  const { data, error } = await selectAudio(createPublicSupabase(), id);
  if (error) throw new Error(`Lecture du fichier audio impossible : ${error.message}`);
  return data;
}

/** Fichier visible avec la session de l'utilisateur (RLS : brouillons réservés à l'équipe). */
export async function getAudioForSession(id: string): Promise<AudioLookupRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await selectAudio(supabase as unknown as QueryClient, id);
  if (error) {
    console.error("Lecture du fichier audio (session)", error);
    return null;
  }
  return data;
}
