/**
 * Envoi d'un fichier vers une URL signée (PUT), avec suivi de progression.
 * XMLHttpRequest reste le seul moyen standard de connaître l'avancement d'un envoi.
 */

export type UploadFailure = "network" | "tooLarge" | "rejected" | "aborted";

export type UploadOutcome = { ok: true } | { ok: false; error: UploadFailure; retryable: boolean };

export interface UploadOptions {
  onProgress?: (loaded: number) => void;
  signal?: AbortSignal;
  /** Délai d'inactivité avant d'abandonner (aucun octet envoyé), en ms. */
  stallTimeoutMs?: number;
}

/** Une tentative d'envoi. */
export function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  { onProgress, signal, stallTimeoutMs = 60_000 }: UploadOptions = {},
): Promise<UploadOutcome> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ ok: false, error: "aborted", retryable: false });
      return;
    }
    const xhr = new XMLHttpRequest();
    let settled = false;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (outcome: UploadOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(stallTimer);
      signal?.removeEventListener("abort", onAbort);
      resolve(outcome);
    };
    // Connexion figée (ex. téléphone qui change de réseau) : on relance plutôt que d'attendre indéfiniment.
    const armStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        xhr.abort();
        finish({ ok: false, error: "network", retryable: true });
      }, stallTimeoutMs);
    };
    const onAbort = () => {
      xhr.abort();
      finish({ ok: false, error: "aborted", retryable: false });
    };

    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (event) => {
      armStallTimer();
      if (event.lengthComputable) onProgress?.(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) finish({ ok: true });
      else if (xhr.status === 413) finish({ ok: false, error: "tooLarge", retryable: false });
      // 5xx et 429 : incident passager côté stockage.
      else if (xhr.status >= 500 || xhr.status === 429) finish({ ok: false, error: "network", retryable: true });
      else finish({ ok: false, error: "rejected", retryable: false });
    };
    xhr.onerror = () => finish({ ok: false, error: "network", retryable: true });
    xhr.ontimeout = () => finish({ ok: false, error: "network", retryable: true });
    xhr.onabort = () => finish({ ok: false, error: "aborted", retryable: false });
    signal?.addEventListener("abort", onAbort);
    armStallTimer();
    xhr.send(body);
  });
}

export interface RetryOptions extends UploadOptions {
  /** Nombre total de tentatives (3 par défaut). */
  attempts?: number;
  /** Attente avant la tentative n (en ms). */
  backoffMs?: (attempt: number) => number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Envoi avec nouvelles tentatives automatiques après une coupure réseau. */
export async function uploadWithRetry(
  url: string,
  body: Blob,
  contentType: string,
  { attempts = 3, backoffMs = (n) => 1500 * n, ...options }: RetryOptions = {},
): Promise<UploadOutcome> {
  let outcome: UploadOutcome = { ok: false, error: "network", retryable: true };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (attempt > 1) {
      options.onProgress?.(0);
      await wait(backoffMs(attempt - 1));
    }
    outcome = await putWithProgress(url, body, contentType, options);
    if (outcome.ok || !outcome.retryable) return outcome;
  }
  return outcome;
}
