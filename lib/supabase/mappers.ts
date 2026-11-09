import type { AudioFile, Sermon } from "@/types/sermon";
import type { AudioFileRow, SermonRow } from "./database.types";

/** Colonnes demandées à Supabase pour une prédication et ses fichiers. */
export const SERMON_SELECT = `
  id, preached_on, title, scripture_references, notes, language,
  is_published, created_by, created_at, updated_at,
  audio_files (
    id, sermon_id, name, storage_path, duration_seconds, format, mime_type,
    size_bytes, is_downloadable, position, created_at
  )
` as const;

/**
 * Les pages n'ont pas besoin de savoir où est stocké un fichier : la lecture passe par
 * /api/audio/<id>. `storage_provider` n'est donc pas demandé ici (le site fonctionne
 * aussi avant l'exécution de la mise à jour SQL).
 */
type ListedAudioRow = Omit<AudioFileRow, "storage_provider">;

export type SermonWithAudioRow = SermonRow & { audio_files: ListedAudioRow[] | null };

/**
 * URL de lecture d'un fichier audio. Elle passe toujours par le site
 * (app/api/audio/[id]/route.ts) : le serveur vérifie que la prédication est publiée,
 * ou que le visiteur fait partie de l'équipe, avant de rediriger vers le fichier.
 * Le navigateur ne connaît donc ni R2 ni Supabase Storage.
 */
export function audioPlaybackUrl(audioId: string): string {
  return `/api/audio/${audioId}`;
}

export function audioDownloadUrl(audioId: string): string {
  return `/api/audio/${audioId}?download=1`;
}

export function mapAudioRow(row: ListedAudioRow): AudioFile {
  return {
    id: row.id,
    name: row.name,
    url: audioPlaybackUrl(row.id),
    downloadUrl: row.is_downloadable ? audioDownloadUrl(row.id) : null,
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
    notes: row.notes,
    language: row.language,
    published: row.is_published,
    createdAt: row.created_at,
    audioFiles: [...(row.audio_files ?? [])]
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map(mapAudioRow),
  };
}
