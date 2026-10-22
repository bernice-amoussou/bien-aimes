"use client";

import { saveSermonAction, type ActionErrorCode, type SaveSermonAudioInput } from "@/app/admin/actions";
import { createUuid } from "@/lib/sermon-utils";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { AUDIO_BUCKET, requireSupabaseEnv } from "@/lib/supabase/config";
import type { AudioDraft } from "@/types/audio-draft";
import type { SermonDraft } from "@/types/sermon";

/** Types MIME acceptés par le bucket (voir supabase/schema.sql), déduits de l'extension. */
const MIME_BY_FORMAT: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  webm: "audio/webm",
  flac: "audio/flac",
};

function contentTypeFor(draft: AudioDraft): string {
  return MIME_BY_FORMAT[draft.format.toLowerCase()] ?? draft.file?.type.split(";")[0] ?? "audio/mpeg";
}

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

export type SaveError = ActionErrorCode | "upload" | "uploadTooLarge";

export type SaveResult = { ok: true; id: string } | { ok: false; error: SaveError };

type UploadOutcome = { ok: true } | { ok: false; error: "upload" | "uploadTooLarge" };

/**
 * Téléversement direct vers Supabase Storage avec suivi de progression.
 * Même requête que le client supabase-js (POST /storage/v1/object/…), mais via
 * XMLHttpRequest, seul moyen de connaître l'avancement de l'envoi.
 * L'autorisation repose sur le jeton de session de l'utilisateur et les règles RLS.
 */
function uploadWithProgress(
  path: string,
  file: File,
  contentType: string,
  accessToken: string,
  onProgress: (loaded: number) => void,
): Promise<UploadOutcome> {
  const { url, key } = requireSupabaseEnv();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${url}/storage/v1/object/${AUDIO_BUCKET}/${encodedPath}`);
    xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
        return;
      }
      // Storage signale un fichier trop gros par un HTTP 413 ou par `statusCode: "413"` dans le corps.
      let tooLarge = xhr.status === 413;
      try {
        tooLarge ||= String((JSON.parse(xhr.responseText) as { statusCode?: unknown }).statusCode) === "413";
      } catch {
        // Corps non JSON : on garde le code HTTP.
      }
      resolve({ ok: false, error: tooLarge ? "uploadTooLarge" : "upload" });
    };
    xhr.onerror = () => resolve({ ok: false, error: "upload" });
    xhr.onabort = () => resolve({ ok: false, error: "upload" });
    xhr.send(file);
  });
}

/**
 * Enregistre une prédication :
 * 1. téléverse les nouveaux fichiers directement du navigateur vers Supabase Storage
 *    (les gros fichiers ne transitent pas par le serveur Next.js) ;
 * 2. enregistre la prédication et ses fichiers via une Server Action (transaction SQL) ;
 * 3. en cas d'échec, supprime les fichiers déjà téléversés.
 */
export async function saveSermon(
  sermonId: string,
  draft: SermonDraft,
  files: AudioDraft[],
  onProgress: (progress: SaveProgress) => void,
): Promise<SaveResult> {
  const supabase = getBrowserSupabase();
  const toUpload = files.filter((f) => f.source !== "existing" && f.file);
  const uploadedPaths: string[] = [];
  const pathByDraft = new Map<string, string>();

  const cleanup = async () => {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(AUDIO_BUCKET).remove(uploadedPaths);
    }
  };

  if (toUpload.length > 0) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return { ok: false, error: "unauthorized" };

    const totalBytes = toUpload.reduce((sum, f) => sum + (f.file?.size ?? 0), 0);
    let doneBytes = 0;

    for (const [index, file] of toUpload.entries()) {
      const report = (loaded: number) =>
        onProgress({
          stage: "uploading",
          current: index + 1,
          total: toUpload.length,
          loaded: doneBytes + loaded,
          totalBytes,
        });
      report(0);
      const path = `sermons/${sermonId}/${createUuid()}.${file.format.toLowerCase()}`;
      const outcome = await uploadWithProgress(path, file.file as File, contentTypeFor(file), accessToken, report);
      if (!outcome.ok) {
        await cleanup();
        return outcome;
      }
      doneBytes += file.file?.size ?? 0;
      report(0);
      uploadedPaths.push(path);
      pathByDraft.set(file.id, path);
    }
  }

  onProgress({ stage: "saving" });
  const audio: SaveSermonAudioInput[] = files.map((file) => ({
    ...(file.source === "existing" ? { id: file.id } : {}),
    name: file.name.trim() || file.format.toUpperCase(),
    storagePath: file.source === "existing" ? (file.storagePath ?? "") : (pathByDraft.get(file.id) ?? ""),
    duration: file.duration,
    format: file.format,
    mimeType: file.source === "existing" ? null : contentTypeFor(file),
    size: file.size,
    downloadable: file.downloadable,
  }));

  let result: Awaited<ReturnType<typeof saveSermonAction>>;
  try {
    result = await saveSermonAction({ id: sermonId, ...draft, audio });
  } catch {
    await cleanup();
    return { ok: false, error: "server" };
  }

  if (!result.ok) {
    await cleanup();
    return { ok: false, error: result.error };
  }
  return { ok: true, id: result.data.id };
}
