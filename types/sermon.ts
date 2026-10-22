/**
 * Modèle de données d'une prédication, côté application.
 * Correspond aux tables Supabase `sermons` (1) ──< `audio_files` (n)
 * — voir supabase/schema.sql et lib/supabase/mappers.ts.
 */

export type SermonLanguage = "fr" | "en";

export interface AudioFile {
  id: string;
  /** Nom lisible du fichier ou de l'enregistrement. */
  name: string;
  /** URL de lecture. `null` tant que le fichier n'est pas réellement hébergé. */
  url: string | null;
  /** URL qui force le téléchargement, si le fichier l'autorise. */
  downloadUrl: string | null;
  /** Chemin dans le bucket Supabase, `null` pour les données de démonstration. */
  storagePath: string | null;
  /** Durée en secondes, `null` si inconnue. */
  duration: number | null;
  /** Format court : "mp3", "m4a", "webm"… */
  format: string;
  /** Taille en octets, `null` si inconnue. */
  size: number | null;
  /** Le téléchargement public est-il autorisé pour ce fichier ? */
  downloadable: boolean;
}

export interface Sermon {
  id: string;
  /** Date de la prédication au format ISO `YYYY-MM-DD`. */
  date: string;
  title: string;
  /** Au moins une référence, ex. "Matthieu 17:20". */
  scriptureReferences: string[];
  notes: string | null;
  language: SermonLanguage;
  published: boolean;
  /** Date d'ajout (ISO), `null` pour les données de démonstration. */
  createdAt: string | null;
  audioFiles: AudioFile[];
}

/** Données saisies dans le formulaire d'administration. */
export interface SermonDraft {
  date: string;
  title: string;
  scriptureReferences: string[];
  notes: string;
  language: SermonLanguage;
  published: boolean;
}
