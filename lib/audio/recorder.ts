/**
 * Utilitaires d'enregistrement audio — API MediaRecorder / getUserMedia.
 * Les codecs disponibles varient selon les navigateurs (Chrome/Firefox : WebM/Opus,
 * Safari : MP4/AAC), on interroge donc `MediaRecorder.isTypeSupported`.
 */

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/aac",
];

export type RecorderErrorCode =
  | "unsupported"
  | "insecure"
  | "permissionDenied"
  | "noMicrophone"
  | "inUse"
  | "empty"
  | "generic";

/**
 * Pourquoi l'enregistrement est impossible ici, ou `null` s'il est possible.
 * Hors HTTPS et hors localhost, les navigateurs (Chrome compris) masquent
 * entièrement l'accès au micro : ce n'est pas le navigateur qui est en cause.
 */
export function getRecordingBlockReason(): "insecure" | "unsupported" | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) return "insecure";
  return isRecordingSupported() ? null : "unsupported";
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** Premier type MIME pris en charge, ou `undefined` pour laisser le navigateur choisir. */
export function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/flac": "flac",
  "audio/x-m4a": "m4a",
};

/** "audio/webm;codecs=opus" → "webm" */
export function extensionForMimeType(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  return EXTENSIONS[base] ?? (base.split("/")[1] || "audio");
}

export function mapRecorderError(error: unknown): RecorderErrorCode {
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
      case "SecurityError":
        return "permissionDenied";
      case "NotFoundError":
      case "DevicesNotFoundError":
      case "OverconstrainedError":
        return "noMicrophone";
      case "NotReadableError":
      case "TrackStartError":
      case "AbortError":
        return "inUse";
      case "NotSupportedError":
        return "unsupported";
    }
  }
  return "generic";
}
