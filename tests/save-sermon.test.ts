import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  save: vi.fn(),
  discard: vi.fn(async () => ({ ok: true, data: null })),
  upload: vi.fn(),
}));

vi.mock("@/app/admin/actions", () => ({
  prepareAudioUploadsAction: mocks.prepare,
  saveSermonAction: mocks.save,
  discardAudioUploadsAction: mocks.discard,
}));
vi.mock("@/lib/audio/upload", () => ({ uploadWithRetry: mocks.upload }));

import { saveSermon, type SaveProgress } from "@/lib/admin/save-sermon";
import type { AudioDraft } from "@/types/audio-draft";
import type { SermonDraft } from "@/types/sermon";

const SERMON = "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const draft: SermonDraft = {
  date: "2026-11-01",
  title: "La foi",
  scriptureReferences: ["Hébreux 11:1"],
  notes: "",
  language: "fr",
  published: true,
};

function local(id: string, size: number, format = "mp3", source: AudioDraft["source"] = "import"): AudioDraft {
  return {
    id,
    name: id,
    url: `blob:${id}`,
    duration: 60,
    format,
    size,
    downloadable: true,
    source,
    file: new File([new Uint8Array(size)], `${id}.${format}`),
  };
}

const existing: AudioDraft = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Ancien",
  url: "/api/audio/11111111-1111-4111-8111-111111111111",
  duration: 10,
  format: "mp3",
  size: 5,
  downloadable: true,
  source: "existing",
  storagePath: "sermons/x/y.mp3",
};

const keyFor = (n: number) => `sermons/${SERMON}/0000000${n}-0000-4000-8000-000000000000.mp3`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("navigator", { onLine: true });
  mocks.prepare.mockImplementation(async (_id: string, files: unknown[]) => ({
    ok: true,
    data: files.map((_, i) => ({ key: keyFor(i), url: `https://r2/put/${i}`, contentType: "audio/mpeg" })),
  }));
  mocks.upload.mockImplementation(async (_url: string, file: File, _type: string, { onProgress }) => {
    onProgress?.(file.size);
    return { ok: true };
  });
  mocks.save.mockResolvedValue({ ok: true, data: { id: SERMON } });
});
afterEach(() => vi.unstubAllGlobals());

describe("enregistrement d'une prédication", () => {
  it("envoie les nouveaux fichiers puis enregistre leurs clés", async () => {
    const progress: SaveProgress[] = [];
    const result = await saveSermon(SERMON, draft, [existing, local("a", 100), local("b", 300, "webm", "recording")], (p) =>
      progress.push(p),
    );

    expect(result).toEqual({ ok: true, id: SERMON });
    expect(mocks.prepare).toHaveBeenCalledWith(SERMON, [
      { format: "mp3", size: 100 },
      { format: "webm", size: 300 },
    ]);
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    const saved = mocks.save.mock.calls[0][0];
    expect(saved.audio).toEqual([
      expect.objectContaining({ id: existing.id, storagePath: "" }),
      expect.objectContaining({ storagePath: keyFor(0), format: "mp3" }),
      expect.objectContaining({ storagePath: keyFor(1), format: "webm" }),
    ]);
    // Progression cumulée, puis étape d'enregistrement.
    expect(progress).toContainEqual({ stage: "uploading", current: 2, total: 2, loaded: 400, totalBytes: 400 });
    expect(progress.at(-1)).toEqual({ stage: "saving" });
    expect(mocks.discard).not.toHaveBeenCalled();
  });

  it("n'appelle pas le stockage quand aucun nouveau fichier n'est ajouté", async () => {
    await saveSermon(SERMON, draft, [existing], () => {});
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledOnce();
  });
});

describe("erreurs et envois interrompus", () => {
  it("supprime les fichiers déjà envoyés si un envoi échoue (réseau)", async () => {
    mocks.upload.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, error: "network", retryable: true });
    const result = await saveSermon(SERMON, draft, [local("a", 10), local("b", 10)], () => {});
    expect(result).toEqual({ ok: false, error: "upload" });
    expect(mocks.discard).toHaveBeenCalledWith(SERMON, [keyFor(0), keyFor(1)]);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("signale la perte de connexion", async () => {
    mocks.upload.mockImplementation(async () => {
      vi.stubGlobal("navigator", { onLine: false });
      return { ok: false, error: "network", retryable: true };
    });
    const result = await saveSermon(SERMON, draft, [local("a", 10)], () => {});
    expect(result).toEqual({ ok: false, error: "offline" });
  });

  it("ne commence pas hors ligne", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(await saveSermon(SERMON, draft, [local("a", 10)], () => {})).toEqual({ ok: false, error: "offline" });
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("nettoie les fichiers envoyés si le serveur refuse l'enregistrement", async () => {
    mocks.save.mockResolvedValue({ ok: false, error: "invalidAudio" });
    const result = await saveSermon(SERMON, draft, [local("a", 10)], () => {});
    expect(result).toEqual({ ok: false, error: "invalidAudio" });
    expect(mocks.discard).toHaveBeenCalledWith(SERMON, [keyFor(0)]);
  });

  it("nettoie les fichiers envoyés si l'action serveur est injoignable", async () => {
    mocks.save.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await saveSermon(SERMON, draft, [local("a", 10)], () => {});
    expect(result).toEqual({ ok: false, error: "server" });
    expect(mocks.discard).toHaveBeenCalled();
  });

  it("transmet le refus du serveur (droits, format, taille) sans rien envoyer", async () => {
    mocks.prepare.mockResolvedValue({ ok: false, error: "tooLarge" });
    expect(await saveSermon(SERMON, draft, [local("a", 10)], () => {})).toEqual({ ok: false, error: "uploadTooLarge" });
    mocks.prepare.mockResolvedValue({ ok: false, error: "unauthorized" });
    expect(await saveSermon(SERMON, draft, [local("a", 10)], () => {})).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
