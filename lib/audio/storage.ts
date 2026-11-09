import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { audioReadUrl, deleteAudioObjects } from "@/lib/r2/client";
import { AUDIO_BUCKET, requireSupabaseEnv } from "@/lib/supabase/config";
import type { Database, StorageProvider } from "@/lib/supabase/database.types";
import { contentTypeForFormat, isAllowedAudioFormat, isValidStoredKey } from "./formats";

/**
 * Accès aux fichiers audio quel que soit leur emplacement :
 * - « r2 » : Cloudflare R2 (tous les nouveaux fichiers) ;
 * - « supabase » : ancien bucket Supabase Storage, en lecture seule le temps
 *   de la migration (scripts/audio-storage.mjs).
 */

export interface StoredAudio {
  storage_path: string;
  storage_provider: StorageProvider;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** Nom de fichier proposé au téléchargement. */
export function downloadFileName(name: string, format: string): string {
  const base = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").trim() || "predication";
  return `${base}.${format}`;
}

/** URL vers laquelle rediriger le lecteur ou le téléchargement. */
export async function resolveAudioUrl(
  file: StoredAudio & { name: string; format: string; mime_type: string | null },
  options: { download: boolean; publicAccess: boolean },
): Promise<string> {
  if (!isValidStoredKey(file.storage_path)) throw new Error("Clé de stockage invalide");
  const downloadName = options.download ? downloadFileName(file.name, file.format) : undefined;

  if (file.storage_provider === "supabase") {
    // Ancien bucket public : URL publique, `download` ajoute Content-Disposition: attachment.
    const { url } = requireSupabaseEnv();
    const base = `${url}/storage/v1/object/public/${AUDIO_BUCKET}/${encodePath(file.storage_path)}`;
    return downloadName ? `${base}?download=${encodeURIComponent(downloadName)}` : base;
  }

  const format = file.format.toLowerCase();
  return audioReadUrl(file.storage_path, {
    allowPublic: options.publicAccess,
    downloadName,
    contentType: file.mime_type ?? (isAllowedAudioFormat(format) ? contentTypeForFormat(format) : undefined),
  });
}

/**
 * Supprime les objets de fichiers retirés. Les copies dans l'ancien bucket Supabase
 * d'un fichier déjà migré vers R2 ne sont PAS supprimées : elles restent jusqu'à la
 * validation de la migration (voir README).
 */
export async function deleteStoredAudio(
  files: StoredAudio[],
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const r2Keys = files.filter((f) => f.storage_provider === "r2").map((f) => f.storage_path);
  const legacyPaths = files.filter((f) => f.storage_provider === "supabase").map((f) => f.storage_path);

  // Les données sont déjà enregistrées : un échec ici laisse au pire un fichier orphelin,
  // repérable avec « npm run audio:orphans ». On ne fait donc jamais échouer l'action.
  try {
    const failed = await deleteAudioObjects(r2Keys.filter(isValidStoredKey));
    if (failed.length > 0) console.error("Objets R2 non supprimés (voir npm run audio:orphans)", failed);
  } catch (error) {
    console.error("Suppression R2 impossible", error);
  }

  if (legacyPaths.length > 0) {
    const { error } = await supabase.storage.from(AUDIO_BUCKET).remove(legacyPaths);
    if (error) console.error("Suppression Supabase Storage", error);
  }
}
