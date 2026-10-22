/** Fichier audio en cours d'édition dans le formulaire d'administration. */
export interface AudioDraft {
  /** Identifiant local, ou identifiant de la ligne `audio_files` pour un fichier existant. */
  id: string;
  name: string;
  /** URL `blob:` pour les fichiers locaux, URL publique pour les fichiers existants. */
  url: string | null;
  duration: number | null;
  format: string;
  size: number | null;
  downloadable: boolean;
  source: "import" | "recording" | "existing";
  /** Chemin Storage d'un fichier existant. */
  storagePath?: string | null;
  /** Fichier local, conservé en mémoire jusqu'au téléversement. */
  file?: File;
}
