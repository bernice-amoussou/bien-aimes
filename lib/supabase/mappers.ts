import type { AudioFile, Sermon } from "@/types/sermon";
import { AUDIO_BUCKET, requireSupabaseEnv } from "./config";
import type { AudioFileRow, SermonRow } from "./database.types";

/** Colonnes demandées à Supabase pour une prédication et ses fichiers. */
export const SERMON_SELECT = `
  id, preached_on, title, scripture_references, preacher, notes, language,
  is_published, created_by, created_at, updated_at,
  audio_files (
    id, sermon_id, name, storage_path, duration_seconds, format, mime_type,
    size_bytes, is_downloadable, position, created_at
  )
` as const;

export type SermonWithAudioRow = SermonRow & { audio_files: AudioFileRow[] | null };

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** URL publique stable d'un objet du bucket audio (bucket public en lecture). */
export function publicAudioUrl(storagePath: string): string {
  const { url } = requireSupabaseEnv();
  return `${url}/storage/v1/object/public/${AUDIO_BUCKET}/${encodeStoragePath(storagePath)}`;
}

function safeFileName(name: string, format: string) {
  const base = name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "predication";
  return `${base}.${format}`;
}

export function mapAudioRow(row: AudioFileRow): AudioFile {
  const url = publicAudioUrl(row.storage_path);
  return {
    id: row.id,
    name: row.name,
    url,
    // Supabase ajoute Content-Disposition: attachment avec ce paramètre.
    downloadUrl: row.is_downloadable
      ? `${url}?download=${encodeURIComponent(safeFileName(row.name, row.format))}`
      : null,
    storagePath: row.storage_path,
    duration: row.duration_seconds === null ? null : Number(row.duration_seconds),
    format: row.format,
    size: row.size_bytes === null ? null : Number(row.size_bytes),
    downloadable: row.is_downloadable,
  };
}

export function mapSermonRow(row: SermonWithAudioRow): Sermon {
  return {
    id: row.id,
    date: row.preached_on,
    title: row.title,
    scriptureReferences: row.scripture_references,
    preacher: row.preacher,
    notes: row.notes,
    language: row.language,
    published: row.is_published,
    createdAt: row.created_at,
    audioFiles: [...(row.audio_files ?? [])]
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map(mapAudioRow),
  };
}
