import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { putWithProgress, uploadWithRetry } from "@/lib/audio/upload";

type Behaviour = { status?: number; error?: boolean; progress?: number[]; hang?: boolean };

/** Faux XMLHttpRequest : chaque instance suit le scénario suivant de la file. */
class FakeXhr {
  static scenarios: Behaviour[] = [];
  static instances: FakeXhr[] = [];
  method = "";
  url = "";
  headers: Record<string, string> = {};
  status = 0;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  aborted = false;

  constructor() {
    FakeXhr.instances.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  abort() {
    this.aborted = true;
  }
  send() {
    const behaviour = FakeXhr.scenarios.shift() ?? { status: 200 };
    if (behaviour.hang) return;
    queueMicrotask(() => {
      for (const loaded of behaviour.progress ?? []) this.upload.onprogress?.({ lengthComputable: true, loaded });
      if (behaviour.error) return this.onerror?.();
      this.status = behaviour.status ?? 200;
      this.onload?.();
    });
  }
}

const body = new Blob([new Uint8Array(10)]);

beforeEach(() => {
  FakeXhr.scenarios = [];
  FakeXhr.instances = [];
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("envoi vers l'URL signée", () => {
  it("envoie en PUT avec le type MIME et remonte la progression", async () => {
    FakeXhr.scenarios = [{ status: 200, progress: [4, 10] }];
    const progress: number[] = [];
    const outcome = await putWithProgress("https://r2.example/put", body, "audio/mpeg", {
      onProgress: (n) => progress.push(n),
    });
    expect(outcome).toEqual({ ok: true });
    expect(FakeXhr.instances[0].method).toBe("PUT");
    expect(FakeXhr.instances[0].headers["content-type"]).toBe("audio/mpeg");
    expect(progress).toEqual([4, 10]);
  });

  it("signale un fichier trop volumineux (413) sans réessayer", async () => {
    FakeXhr.scenarios = [{ status: 413 }];
    const outcome = await uploadWithRetry("u", body, "audio/mpeg", { backoffMs: () => 0 });
    expect(outcome).toMatchObject({ ok: false, error: "tooLarge" });
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it("ne réessaie pas un refus du stockage (URL expirée, signature invalide)", async () => {
    FakeXhr.scenarios = [{ status: 403 }];
    const outcome = await uploadWithRetry("u", body, "audio/mpeg", { backoffMs: () => 0 });
    expect(outcome).toMatchObject({ ok: false, error: "rejected" });
    expect(FakeXhr.instances).toHaveLength(1);
  });
});

describe("coupures réseau", () => {
  it("réessaie automatiquement puis réussit", async () => {
    FakeXhr.scenarios = [{ error: true }, { status: 503 }, { status: 200 }];
    const outcome = await uploadWithRetry("u", body, "audio/mpeg", { backoffMs: () => 0 });
    expect(outcome).toEqual({ ok: true });
    expect(FakeXhr.instances).toHaveLength(3);
  });

  it("abandonne après le nombre maximal de tentatives", async () => {
    FakeXhr.scenarios = [{ error: true }, { error: true }, { error: true }];
    const outcome = await uploadWithRetry("u", body, "audio/mpeg", { backoffMs: () => 0 });
    expect(outcome).toMatchObject({ ok: false, error: "network" });
    expect(FakeXhr.instances).toHaveLength(3);
  });

  it("interrompt un envoi figé (aucun octet envoyé pendant le délai)", async () => {
    vi.useFakeTimers();
    FakeXhr.scenarios = [{ hang: true }];
    const promise = putWithProgress("u", body, "audio/mpeg", { stallTimeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1001);
    await expect(promise).resolves.toMatchObject({ ok: false, error: "network", retryable: true });
    expect(FakeXhr.instances[0].aborted).toBe(true);
  });

  it("respecte une annulation", async () => {
    const controller = new AbortController();
    FakeXhr.scenarios = [{ hang: true }];
    const promise = putWithProgress("u", body, "audio/mpeg", { signal: controller.signal });
    controller.abort();
    await expect(promise).resolves.toMatchObject({ ok: false, error: "aborted" });
  });
});
