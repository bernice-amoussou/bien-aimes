/**
 * Formats audio acceptés et clés de stockage — module partagé par le navigateur,
 * le serveur et les tests (aucune dépendance, aucun secret).
 *
 * Seuls les formats ci-dessous peuvent être envoyés. Le navigateur filtre
 * d'après l'extension et le type MIME ; le serveur vérifie ensuite le contenu
 * réel du fichier (signature binaire) avant de l'enregistrer.
 */

export const AUDIO_FORMATS = {
  mp3: {
    contentType: "audio/mpeg",
    mimeTypes: ["audio/mpeg", "audio/mp3", "audio/mpeg3", "audio/x-mpeg", "audio/x-mp3"],
  },
  wav: {
    contentType: "audio/wav",
    mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"],
  },
  m4a: {
    contentType: "audio/mp4",
    mimeTypes: ["audio/mp4", "audio/x-m4a", "audio/m4a", "audio/mp4a-latm"],
  },
  aac: {
    // Fichiers .aac des enregistreurs de téléphone (ex. Samsung).
    contentType: "audio/aac",
    mimeTypes: ["audio/aac", "audio/x-aac", "audio/aacp", "audio/x-hx-aac-adts"],
  },
  ogg: {
    contentType: "audio/ogg",
    mimeTypes: ["audio/ogg", "application/ogg", "audio/vorbis", "audio/opus"],
  },
  webm: {
    // Certains systèmes déclarent un .webm audio comme « video/webm ».
    contentType: "audio/webm",
    mimeTypes: ["audio/webm", "video/webm"],
  },
} as const;

export type AudioFormat = keyof typeof AUDIO_FORMATS;

export const ALLOWED_AUDIO_FORMATS = Object.keys(AUDIO_FORMATS) as AudioFormat[];

export function isAllowedAudioFormat(value: unknown): value is AudioFormat {
  return typeof value === "string" && Object.hasOwn(AUDIO_FORMATS, value);
}

/** Type MIME de référence, utilisé pour l'envoi et la lecture. */
export function contentTypeForFormat(format: AudioFormat): string {
  return AUDIO_FORMATS[format].contentType;
}

/** "audio/webm;codecs=opus" → "audio/webm" */
export function normalizeMimeType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

export function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

/** Format d'après un type MIME seul (ex. enregistrement du micro). */
export function formatFromMimeType(type: string): AudioFormat | null {
  const mime = normalizeMimeType(type);
  if (!mime) return null;
  for (const format of ALLOWED_AUDIO_FORMATS) {
    if ((AUDIO_FORMATS[format].mimeTypes as readonly string[]).includes(mime)) return format;
  }
  return null;
}

/** Types MIME « neutres » qu'envoient certains téléphones ou systèmes à la place du vrai type. */
const GENERIC_MIME_TYPES = ["", "application/octet-stream", "binary/octet-stream"];

/**
 * Format d'un fichier choisi par l'utilisateur, ou `null` s'il n'est pas accepté.
 * L'extension fait foi ; un type MIME manifestement non audio (image, PDF…) est refusé.
 */
export function formatFromFile(name: string, type: string): AudioFormat | null {
  const ext = extensionOf(name);
  const mime = normalizeMimeType(type);
  if (isAllowedAudioFormat(ext)) {
    const declared = AUDIO_FORMATS[ext].mimeTypes as readonly string[];
    const plausible = GENERIC_MIME_TYPES.includes(mime) || mime.startsWith("audio/") || declared.includes(mime);
    return plausible ? ext : null;
  }
  // Sans extension reconnue : on se fie au type MIME s'il désigne un format accepté.
  return ext === "" ? formatFromMimeType(mime) : null;
}

/** Octets à lire en début de fichier pour reconnaître son format. */
export const SNIFF_BYTES = 64;

function ascii(bytes: Uint8Array, start: number, text: string): boolean {
  if (bytes.length < start + text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[start + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Reconnaît le format réel d'un fichier à partir de ses premiers octets.
 * Renvoie `null` si ce n'est aucun des formats acceptés.
 */
export function sniffAudioFormat(bytes: Uint8Array): AudioFormat | null {
  if (ascii(bytes, 0, "ID3")) return "mp3";
  // Trame MPEG audio sans balise ID3 : 11 bits de synchronisation, couche ≠ 00.
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0) {
    return "mp3";
  }
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WAVE")) return "wav";
  if (ascii(bytes, 4, "ftyp")) return "m4a";
  // AAC brut : en-tête ADTS (synchronisation 0xFFF, couche 00) ou ADIF.
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return "aac";
  if (ascii(bytes, 0, "ADIF")) return "aac";
  if (ascii(bytes, 0, "OggS")) return "ogg";
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "webm";
  }
  return null;
}

/**
 * Le contenu reçu correspond-il au format annoncé ?
 * Un « .aac » de téléphone peut être de l'AAC brut (ADTS), un conteneur MP4
 * ou de l'ADTS précédé d'une balise ID3 : les trois sont acceptés.
 */
export function contentMatchesFormat(declared: AudioFormat, bytes: Uint8Array): boolean {
  const sniffed = sniffAudioFormat(bytes);
  if (declared === "aac") return sniffed === "aac" || sniffed === "m4a" || ascii(bytes, 0, "ID3");
  return sniffed === declared;
}

// ─── Clés de stockage ──────────────────────────────────────────────────────

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Clé d'un nouvel envoi : sermons/<id prédication>/<uuid>.<format accepté>. */
const UPLOAD_KEY_PATTERN = new RegExp(`^sermons/(${UUID})/(${UUID})\\.(${ALLOWED_AUDIO_FORMATS.join("|")})$`);

/** Toute clé enregistrée, y compris les anciens fichiers Supabase (extensions plus variées). */
const STORED_KEY_PATTERN = new RegExp(`^sermons/(${UUID})/[A-Za-z0-9_-]{1,64}\\.[a-z0-9]{1,8}$`);

export function buildAudioKey(sermonId: string, fileId: string, format: AudioFormat): string {
  return `sermons/${sermonId}/${fileId}.${format}`;
}

/** Clé produite par le serveur pour un nouvel envoi dans le dossier de cette prédication. */
export function parseUploadKey(key: unknown, sermonId: string): { format: AudioFormat } | null {
  if (typeof key !== "string") return null;
  const match = UPLOAD_KEY_PATTERN.exec(key);
  if (!match || match[1] !== sermonId.toLowerCase()) return null;
  return { format: match[3] as AudioFormat };
}

/** Clé lue en base : format sûr (aucun « .. », aucun chemin arbitraire). */
export function isValidStoredKey(key: unknown): key is string {
  return typeof key === "string" && STORED_KEY_PATTERN.test(key);
}
