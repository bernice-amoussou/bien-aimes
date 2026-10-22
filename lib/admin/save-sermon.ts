"use client";

import { saveSermonAction, type ActionErrorCode, type SaveSermonAudioInput } from "@/app/admin/actions";
import { createUuid } from "@/lib/sermon-utils";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { AUDIO_BUCKET } from "@/lib/supabase/config";
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
  | { stage: "uploading"; current: number; total: number }
  | { stage: "saving" };

export type SaveError = ActionErrorCode | "upload" | "uploadTooLarge";

export type SaveResult = { ok: true; id: string } | { ok: false; error: SaveError };

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

  for (const [index, file] of toUpload.entries()) {
    onProgress({ stage: "uploading", current: index + 1, total: toUpload.length });
    const path = `sermons/${sermonId}/${createUuid()}.${file.format.toLowerCase()}`;
    const { error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, file.file as File, { contentType: contentTypeFor(file), upsert: false, cacheControl: "31536000" });
    if (error) {
      await cleanup();
      const tooLarge = "statusCode" in error && String(error.statusCode) === "413";
      return { ok: false, error: tooLarge ? "uploadTooLarge" : "upload" };
    }
    uploadedPaths.push(path);
    pathByDraft.set(file.id, path);
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
