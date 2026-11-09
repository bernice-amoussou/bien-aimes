import { getAudioMaxBytes } from "@/lib/supabase/config";
import { ALLOWED_AUDIO_FORMATS, AUDIO_FORMATS, formatFromFile, type AudioFormat } from "./formats";

/** Taille maximale par fichier (NEXT_PUBLIC_AUDIO_MAX_MB), vérifiée aussi côté serveur. */
export const MAX_AUDIO_FILE_SIZE = getAudioMaxBytes();
export const MAX_AUDIO_FILE_MB = Math.round(MAX_AUDIO_FILE_SIZE / 1_000_000);

/** Valeur de l'attribut `accept` du sélecteur de fichiers : MP3, WAV, M4A, AAC, OGG, WebM. */
export const AUDIO_ACCEPT = [
  ...ALLOWED_AUDIO_FORMATS.map((ext) => `.${ext}`),
  ...new Set(ALLOWED_AUDIO_FORMATS.flatMap((format) => AUDIO_FORMATS[format].mimeTypes)),
].join(",");

/** Fichier d'un format accepté (extension et type MIME). Le contenu est revérifié par le serveur. */
export function isAudioFile(file: File): boolean {
  return formatFromFile(file.name, file.type) !== null;
}

/** Format d'un fichier accepté par `isAudioFile`. */
export function audioFormatOf(file: File): AudioFormat {
  return formatFromFile(file.name, file.type) ?? "mp3";
}

export function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

/** Lit la durée d'un fichier local via un élément audio. `null` si indéterminable. */
export function probeAudioDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const done = (value: number | null) => {
      audio.removeAttribute("src");
      audio.load();
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}
