import { getAudioMaxBytes } from "@/lib/supabase/config";
import { extensionForMimeType } from "./recorder";

/** Taille maximale par fichier (NEXT_PUBLIC_AUDIO_MAX_MB), alignée sur la limite de Supabase Storage. */
export const MAX_AUDIO_FILE_SIZE = getAudioMaxBytes();
export const MAX_AUDIO_FILE_MB = Math.round(MAX_AUDIO_FILE_SIZE / 1_000_000);

const AUDIO_EXTENSIONS = ["mp3", "m4a", "aac", "wav", "ogg", "oga", "opus", "webm", "flac", "mp4"];

export const AUDIO_ACCEPT = ["audio/*", ...AUDIO_EXTENSIONS.map((ext) => `.${ext}`)].join(",");

function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

/** Certains systèmes n'indiquent pas de type MIME : on se rabat alors sur l'extension. */
export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXTENSIONS.includes(extensionOf(file.name));
}

export function audioFormatOf(file: File): string {
  return extensionOf(file.name) || (file.type ? extensionForMimeType(file.type) : "audio");
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
