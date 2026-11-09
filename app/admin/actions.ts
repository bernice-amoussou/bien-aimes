"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeamMember } from "@/lib/admin/auth";
import {
  SNIFF_BYTES,
  buildAudioKey,
  contentTypeForFormat,
  isAllowedAudioFormat,
  parseUploadKey,
  contentMatchesFormat,
} from "@/lib/audio/formats";
import { deleteStoredAudio } from "@/lib/audio/storage";
import { deleteAudioObjects, headAudioObject, presignAudioUpload, readAudioObjectStart } from "@/lib/r2/client";
import { isR2Configured } from "@/lib/r2/config";
import { SERMONS_CACHE_TAG } from "@/lib/sermons";
import { SERMON_TITLE_MAX, createUuid, isUuid, isValidIsoDate } from "@/lib/sermon-utils";
import { getAudioMaxBytes, isSupabaseConfigured } from "@/lib/supabase/config";
import type { SaveAudioPayload } from "@/lib/supabase/database.types";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SermonLanguage } from "@/types/sermon";

/**
 * Mutations de l'administration. Chaque action revérifie la session et le rôle
 * côté serveur (on ne fait jamais confiance au client), puis RLS s'applique
 * de nouveau dans la base.
 */

export type ActionErrorCode =
  | "notConfigured"
  | "storageNotConfigured"
  | "unauthorized"
  | "forbidden"
  | "invalid"
  | "invalidAudio"
  | "tooLarge"
  | "notFound"
  | "server";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: ActionErrorCode };

/** Nombre maximal de fichiers audio par prédication. */
const MAX_FILES_PER_SERMON = 50;
/** Nombre maximal de fichiers envoyés en une fois. */
const MAX_UPLOADS_PER_REQUEST = 20;

/**
 * La mise à jour SQL (colonne `storage_provider`, nouvelle fonction save_sermon)
 * est-elle installée ? Sans elle, un fichier envoyé vers R2 serait enregistré
 * comme un ancien fichier Supabase et deviendrait illisible.
 */
async function isAudioSchemaReady(supabase: Awaited<ReturnType<typeof createServerSupabase>>): Promise<boolean> {
  const { error } = await supabase.from("audio_files").select("storage_provider").limit(1);
  if (error?.code === "42703") {
    console.error("Exécutez supabase/schema.sql : la colonne audio_files.storage_provider est absente.");
    return false;
  }
  return true;
}

// ─── 1. Préparation des envois (URL signées R2) ─────────────────────────────

export interface UploadRequestFile {
  format: string;
  size: number;
}

export interface PreparedUpload {
  key: string;
  url: string;
  contentType: string;
}

function isValidUploadRequest(file: UploadRequestFile, maxBytes: number): boolean | "tooLarge" {
  if (!file || !isAllowedAudioFormat(file.format) || !Number.isSafeInteger(file.size) || file.size <= 0) {
    return false;
  }
  return file.size > maxBytes ? "tooLarge" : true;
}

/**
 * Autorise l'envoi de fichiers pour une prédication : renvoie, pour chacun, une clé
 * générée par le serveur et une URL signée valable 15 minutes pour cette seule clé.
 */
export async function prepareAudioUploadsAction(
  sermonId: string,
  files: UploadRequestFile[],
): Promise<ActionResult<PreparedUpload[]>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "notConfigured" };
  if (!isR2Configured()) return { ok: false, error: "storageNotConfigured" };
  const member = await requireTeamMember();
  if (!member) return { ok: false, error: "unauthorized" };
  if (typeof sermonId !== "string" || !isUuid(sermonId)) return { ok: false, error: "invalid" };
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_UPLOADS_PER_REQUEST) {
    return { ok: false, error: "invalid" };
  }

  const maxBytes = getAudioMaxBytes();
  for (const file of files) {
    const check = isValidUploadRequest(file, maxBytes);
    if (check === "tooLarge") return { ok: false, error: "tooLarge" };
    if (!check) return { ok: false, error: "invalidAudio" };
  }
  if (!(await isAudioSchemaReady(await createServerSupabase()))) return { ok: false, error: "storageNotConfigured" };

  try {
    const uploads = await Promise.all(
      files.map(async (file) => {
        const format = file.format as Parameters<typeof contentTypeForFormat>[0];
        const key = buildAudioKey(sermonId.toLowerCase(), createUuid(), format);
        const contentType = contentTypeForFormat(format);
        return { key, contentType, url: await presignAudioUpload(key, contentType) };
      }),
    );
    return { ok: true, data: uploads };
  } catch (error) {
    console.error("Préparation des envois R2", error);
    return { ok: false, error: "server" };
  }
}

/**
 * Supprime des fichiers envoyés mais jamais enregistrés (envoi interrompu, erreur).
 * Seules des clés du dossier de la prédication ET non référencées en base sont acceptées :
 * cette action ne peut pas supprimer un fichier réellement utilisé.
 */
export async function discardAudioUploadsAction(sermonId: string, keys: string[]): Promise<ActionResult> {
  if (!isSupabaseConfigured() || !isR2Configured()) return { ok: false, error: "notConfigured" };
  const member = await requireTeamMember();
  if (!member) return { ok: false, error: "unauthorized" };
  if (typeof sermonId !== "string" || !isUuid(sermonId) || !Array.isArray(keys) || keys.length > MAX_UPLOADS_PER_REQUEST) {
    return { ok: false, error: "invalid" };
  }
  const candidates = [...new Set(keys)].filter((key) => parseUploadKey(key, sermonId) !== null);
  if (candidates.length === 0) return { ok: true, data: null };

  const supabase = await createServerSupabase();
  const { data: referenced, error } = await supabase
    .from("audio_files")
    .select("storage_path")
    .in("storage_path", candidates);
  if (error) {
    console.error("Vérification des fichiers à supprimer", error);
    return { ok: false, error: "server" };
  }
  const used = new Set((referenced ?? []).map((row) => row.storage_path));
  await deleteAudioObjects(candidates.filter((key) => !used.has(key)));
  return { ok: true, data: null };
}

// ─── 2. Enregistrement d'une prédication ───────────────────────────────────

export interface SaveSermonAudioInput {
  /** Identifiant d'un fichier déjà enregistré ; absent pour un nouveau fichier. */
  id?: string;
  name: string;
  /** Clé du fichier envoyé (nouveaux fichiers uniquement, ignorée sinon). */
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
  if (!input || typeof input !== "object" || typeof input.id !== "string" || !Array.isArray(input.audio)) return false;
  if (!Array.isArray(input.scriptureReferences) || typeof input.title !== "string" || typeof input.notes !== "string") {
    return false;
  }
  const refs = input.scriptureReferences.map((r) => String(r).trim()).filter(Boolean);
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
    input.audio.length <= MAX_FILES_PER_SERMON &&
    input.audio.every(
      (a) =>
        a &&
        (a.id === undefined || (typeof a.id === "string" && isUuid(a.id))) &&
        typeof a.name === "string" &&
        a.name.trim().length > 0 &&
        a.name.length <= 200 &&
        typeof a.format === "string" &&
        /^[a-z0-9]{1,8}$/i.test(a.format) &&
        typeof a.downloadable === "boolean" &&
        // Nouveau fichier : clé produite par prepareAudioUploadsAction pour CETTE prédication.
        (a.id !== undefined || parseUploadKey(a.storagePath, input.id)?.format === a.format.toLowerCase()),
    )
  );
}

type VerifiedUpload = { size: number; contentType: string };

/**
 * Vérifie sur R2 chaque nouveau fichier : présent, taille autorisée et contenu réellement
 * dans le format annoncé (signature binaire). Rien n'est supprimé ici.
 */
async function verifyUploads(
  sermonId: string,
  audio: SaveSermonAudioInput[],
): Promise<{ ok: true; files: Map<string, VerifiedUpload> } | { ok: false; error: ActionErrorCode }> {
  const files = new Map<string, VerifiedUpload>();
  const maxBytes = getAudioMaxBytes();

  for (const item of audio) {
    if (item.id !== undefined) continue;
    const parsed = parseUploadKey(item.storagePath, sermonId);
    if (!parsed) return { ok: false, error: "invalid" };

    const head = await headAudioObject(item.storagePath);
    if (!head || head.size <= 0) return { ok: false, error: "invalidAudio" };
    if (head.size > maxBytes) return { ok: false, error: "tooLarge" };

    const start = await readAudioObjectStart(item.storagePath, SNIFF_BYTES);
    if (!contentMatchesFormat(parsed.format, start)) return { ok: false, error: "invalidAudio" };

    files.set(item.storagePath, { size: head.size, contentType: contentTypeForFormat(parsed.format) });
  }
  return { ok: true, files };
}

export async function saveSermonAction(input: SaveSermonInput): Promise<ActionResult<{ id: string }>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "notConfigured" };
  const member = await requireTeamMember();
  if (!member) return { ok: false, error: "unauthorized" };
  if (!isValidInput(input)) return { ok: false, error: "invalid" };

  const hasNewFiles = input.audio.some((a) => a.id === undefined);
  if (hasNewFiles && !isR2Configured()) return { ok: false, error: "storageNotConfigured" };

  let verified: Map<string, VerifiedUpload>;
  try {
    const check = await verifyUploads(input.id, input.audio);
    if (!check.ok) return check;
    verified = check.files;
  } catch (error) {
    console.error("Vérification des fichiers R2", error);
    return { ok: false, error: "server" };
  }

  const supabase = await createServerSupabase();
  const audio: SaveAudioPayload[] = input.audio.map((a) => {
    const upload = a.id === undefined ? verified.get(a.storagePath) : undefined;
    return {
      ...(a.id ? { id: a.id } : {}),
      name: a.name.trim(),
      storage_path: a.id ? "" : a.storagePath,
      duration_seconds:
        typeof a.duration === "number" && Number.isFinite(a.duration) && a.duration >= 0
          ? Math.round(a.duration * 10) / 10
          : null,
      format: a.format.toLowerCase(),
      // Type et taille : valeurs constatées sur R2, pas celles annoncées par le navigateur.
      mime_type: upload?.contentType ?? null,
      size_bytes: upload?.size ?? null,
      is_downloadable: a.downloadable,
    };
  });

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

  // Fichiers retirés ou remplacés : on libère l'espace de stockage (après la transaction).
  const removed = data.removed_files ?? data.removed_paths.map((path) => ({ storage_path: path, storage_provider: "supabase" as const }));
  if (removed.length > 0) await deleteStoredAudio(removed, supabase);

  updateTag(SERMONS_CACHE_TAG);
  return { ok: true, data: { id: data.id } };
}

// ─── 3. Suppression d'une prédication (administrateurs) ────────────────────

export async function deleteSermonAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "notConfigured" };
  const member = await requireTeamMember();
  if (!member) return { ok: false, error: "unauthorized" };
  if (member.role !== "admin") return { ok: false, error: "forbidden" };
  if (typeof id !== "string" || !isUuid(id)) return { ok: false, error: "invalid" };

  const supabase = await createServerSupabase();
  let { data: files, error: filesError } = await supabase
    .from("audio_files")
    .select("storage_path, storage_provider")
    .eq("sermon_id", id);
  if (filesError?.code === "42703") {
    // Base pas encore mise à jour : tous les fichiers sont dans l'ancien bucket Supabase.
    const legacy = await supabase.from("audio_files").select("storage_path").eq("sermon_id", id);
    files = (legacy.data ?? []).map((f) => ({ storage_path: f.storage_path, storage_provider: "supabase" as const }));
    filesError = legacy.error;
  }
  if (filesError) {
    console.error("Lecture des fichiers de la prédication", filesError);
    return { ok: false, error: "server" };
  }
  if ((files ?? []).some((f) => f.storage_provider === "r2") && !isR2Configured()) {
    return { ok: false, error: "storageNotConfigured" };
  }

  const { data: deleted, error } = await supabase.from("sermons").delete().eq("id", id).select("id");
  if (error) {
    console.error("Suppression prédication", error);
    return { ok: false, error: "server" };
  }
  if (!deleted || deleted.length === 0) return { ok: false, error: "notFound" };

  if (files && files.length > 0) await deleteStoredAudio(files, supabase);

  updateTag(SERMONS_CACHE_TAG);
  return { ok: true, data: null };
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    // « local » : ferme uniquement la session de cet appareil. Par défaut (« global »),
    // Supabase révoque les sessions de TOUS les appareils de l'utilisateur, ce qui
    // déconnectait par exemple l'ordinateur quand on se déconnectait sur le téléphone.
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/connexion");
}
