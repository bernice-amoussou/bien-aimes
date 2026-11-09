"use client";

import {
  discardAudioUploadsAction,
  prepareAudioUploadsAction,
  saveSermonAction,
  type ActionErrorCode,
  type SaveSermonAudioInput,
} from "@/app/admin/actions";
import { uploadWithRetry } from "@/lib/audio/upload";
import type { AudioDraft } from "@/types/audio-draft";
import type { SermonDraft } from "@/types/sermon";

export type SaveProgress =
  | {
      stage: "uploading";
      /** Fichier en cours (à partir de 1) et nombre de fichiers à envoyer. */
      current: number;
      total: number;
      /** Octets envoyés et total à envoyer, tous fichiers confondus. */
      loaded: number;
      totalBytes: number;
    }
  | { stage: "saving" };

export type SaveError = ActionErrorCode | "upload" | "uploadTooLarge" | "offline";

export type SaveResult = { ok: true; id: string } | { ok: false; error: SaveError };

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Enregistre une prédication :
 * 1. le serveur vérifie les droits et fournit une URL d'envoi signée par fichier ;
 * 2. le navigateur envoie les fichiers directement vers le stockage audio
 *    (les gros fichiers ne transitent pas par le serveur Next.js), avec reprise
 *    automatique en cas de coupure réseau ;
 * 3. le serveur vérifie chaque fichier reçu, puis enregistre la prédication (transaction SQL) ;
 * 4. en cas d'échec, les fichiers déjà envoyés sont supprimés : rien n'est modifié.
 */
export async function saveSermon(
  sermonId: string,
  draft: SermonDraft,
  files: AudioDraft[],
  onProgress: (progress: SaveProgress) => void,
): Promise<SaveResult> {
  const toUpload = files.filter((f) => f.source !== "existing" && f.file);
  const uploadedKeys: string[] = [];
  const keyByDraft = new Map<string, string>();

  const cleanup = async (keys: string[]) => {
    if (keys.length === 0) return;
    try {
      await discardAudioUploadsAction(sermonId, keys);
    } catch {
      // Hors ligne : les fichiers restent orphelins, repérés par « npm run audio:orphans ».
    }
  };

  if (isOffline()) return { ok: false, error: "offline" };

  if (toUpload.length > 0) {
    let prepared: Awaited<ReturnType<typeof prepareAudioUploadsAction>>;
    try {
      prepared = await prepareAudioUploadsAction(
        sermonId,
        toUpload.map((f) => ({ format: f.format.toLowerCase(), size: f.file?.size ?? 0 })),
      );
    } catch {
      return { ok: false, error: isOffline() ? "offline" : "upload" };
    }
    if (!prepared.ok) return { ok: false, error: prepared.error === "tooLarge" ? "uploadTooLarge" : prepared.error };

    const totalBytes = toUpload.reduce((sum, f) => sum + (f.file?.size ?? 0), 0);
    let doneBytes = 0;

    for (const [index, file] of toUpload.entries()) {
      const target = prepared.data[index];
      const report = (loaded: number) =>
        onProgress({ stage: "uploading", current: index + 1, total: toUpload.length, loaded: doneBytes + loaded, totalBytes });
      report(0);

      const outcome = await uploadWithRetry(target.url, file.file as File, target.contentType, { onProgress: report });
      if (!outcome.ok) {
        // La clé en cours peut avoir été partiellement écrite : on la nettoie aussi.
        await cleanup([...uploadedKeys, target.key]);
        if (outcome.error === "tooLarge") return { ok: false, error: "uploadTooLarge" };
        return { ok: false, error: isOffline() ? "offline" : "upload" };
      }
      doneBytes += file.file?.size ?? 0;
      report(0);
      uploadedKeys.push(target.key);
      keyByDraft.set(file.id, target.key);
    }
  }

  onProgress({ stage: "saving" });
  const audio: SaveSermonAudioInput[] = files.map((file) => ({
    ...(file.source === "existing" ? { id: file.id } : {}),
    name: file.name.trim() || file.format.toUpperCase(),
    storagePath: file.source === "existing" ? "" : (keyByDraft.get(file.id) ?? ""),
    duration: file.duration,
    format: file.format.toLowerCase(),
    mimeType: null,
    size: file.size,
    downloadable: file.downloadable,
  }));

  let result: Awaited<ReturnType<typeof saveSermonAction>>;
  try {
    result = await saveSermonAction({ id: sermonId, ...draft, audio });
  } catch {
    await cleanup(uploadedKeys);
    return { ok: false, error: isOffline() ? "offline" : "server" };
  }

  if (!result.ok) {
    await cleanup(uploadedKeys);
    return { ok: false, error: result.error === "tooLarge" ? "uploadTooLarge" : result.error };
  }
  return { ok: true, id: result.data.id };
}
