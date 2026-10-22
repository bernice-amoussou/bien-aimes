"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeamMember } from "@/lib/admin/auth";
import { SERMONS_CACHE_TAG } from "@/lib/sermons";
import { SERMON_TITLE_MAX, isUuid, isValidIsoDate } from "@/lib/sermon-utils";
import { AUDIO_BUCKET, isSupabaseConfigured } from "@/lib/supabase/config";
import type { SaveAudioPayload } from "@/lib/supabase/database.types";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SermonLanguage } from "@/types/sermon";

/**
 * Mutations de l'administration. Chaque action revérifie la session et le rôle
 * côté serveur (on ne fait jamais confiance au client), puis RLS s'applique
 * de nouveau dans la base.
 */

export type ActionErrorCode = "notConfigured" | "unauthorized" | "forbidden" | "invalid" | "notFound" | "server";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: ActionErrorCode };

export interface SaveSermonAudioInput {
  /** Identifiant d'un fichier déjà enregistré ; absent pour un nouveau fichier. */
  id?: string;
  name: string;
  storagePath: string;
  duration: number | null;
  format: string;
  mimeType: string | null;
  size: number | null;
  downloadable: boolean;
}

export interface SaveSermonInput {
  id: string;
  date: string;
  title: string;
  scriptureReferences: string[];
  notes: string;
  language: SermonLanguage;
  published: boolean;
  audio: SaveSermonAudioInput[];
}

const LANGUAGES: SermonLanguage[] = ["fr", "en"];

function isValidInput(input: SaveSermonInput): boolean {
  const refs = input.scriptureReferences.map((r) => r.trim()).filter(Boolean);
  const title = input.title.trim();
  return (
    isUuid(input.id) &&
    isValidIsoDate(input.date) &&
    title.length > 0 &&
    title.length <= SERMON_TITLE_MAX &&
    refs.length > 0 &&
    refs.every((r) => r.length <= 120) &&
    input.notes.length <= 10_000 &&
    LANGUAGES.includes(input.language) &&
    typeof input.published === "boolean" &&
    Array.isArray(input.audio) &&
    input.audio.length <= 50 &&
    input.audio.every(
      (a) =>
        (a.id === undefined || isUuid(a.id)) &&
        a.name.trim().length > 0 &&
        a.name.length <= 200 &&
        /^[a-z0-9]{1,8}$/i.test(a.format) &&
        (a.id !== undefined || a.storagePath.startsWith(`sermons/${input.id}/`)),
    )
  );
}

export async function saveSermonAction(input: SaveSermonInput): Promise<ActionResult<{ id: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "notConfigured" };
  const member = await requireTeamMember();
  if (!member) return { ok: false, error: "unauthorized" };
  if (!isValidInput(input)) return { ok: false, error: "invalid" };

  const supabase = await createServerSupabase();
  const audio: SaveAudioPayload[] = input.audio.map((a) => ({
    ...(a.id ? { id: a.id } : {}),
    name: a.name.trim(),
    storage_path: a.storagePath,
    duration_seconds: a.duration !== null && Number.isFinite(a.duration) ? Math.round(a.duration * 10) / 10 : null,
    format: a.format.toLowerCase(),
    mime_type: a.mimeType,
    size_bytes: a.size,
    is_downloadable: a.downloadable,
  }));

  const { data, error } = await supabase.rpc("save_sermon", {
    p_sermon: {
      id: input.id,
      preached_on: input.date,
      title: input.title.trim(),
      scripture_references: input.scriptureReferences.map((r) => r.trim()).filter(Boolean),
      notes: input.notes.trim() || null,
      language: input.language,
      is_published: input.published,
    },
    p_audio: audio,
  });

  if (error) {
    console.error("save_sermon", error);
    return { ok: false, error: error.code === "42501" ? "forbidden" : error.code === "22023" ? "invalid" : "server" };
  }

  // Fichiers retirés de la prédication : on libère l'espace de stockage.
  if (data.removed_paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(AUDIO_BUCKET).remove(data.removed_paths);
    if (storageError) console.error("Suppression Storage", storageError);
  }

  updateTag(SERMONS_CACHE_TAG);
  return { ok: true, data: { id: data.id } };
}

export async function deleteSermonAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "notConfigured" };
  const member = await requireTeamMember();
  if (!member) return { ok: false, error: "unauthorized" };
  if (member.role !== "admin") return { ok: false, error: "forbidden" };
  if (!isUuid(id)) return { ok: false, error: "invalid" };

  const supabase = await createServerSupabase();
  const { data: files } = await supabase.from("audio_files").select("storage_path").eq("sermon_id", id);

  const { data: deleted, error } = await supabase.from("sermons").delete().eq("id", id).select("id");
  if (error) {
    console.error("Suppression prédication", error);
    return { ok: false, error: "server" };
  }
  if (!deleted || deleted.length === 0) return { ok: false, error: "notFound" };

  const paths = (files ?? []).map((f) => f.storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(AUDIO_BUCKET).remove(paths);
    if (storageError) console.error("Suppression Storage", storageError);
  }

  updateTag(SERMONS_CACHE_TAG);
  return { ok: true, data: null };
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/connexion");
}
