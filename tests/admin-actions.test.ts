import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTeamMember: vi.fn(),
  isR2Configured: vi.fn(() => true),
  presignAudioUpload: vi.fn(async (key: string) => `https://r2.example/${key}?signed`),
  headAudioObject: vi.fn(),
  readAudioObjectStart: vi.fn(),
  deleteAudioObjects: vi.fn(async () => [] as string[]),
  audioReadUrl: vi.fn(),
  supabase: null as unknown as FakeSupabase,
  updateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: mocks.updateTag, cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requireTeamMember: mocks.requireTeamMember }));
vi.mock("@/lib/r2/config", () => ({ isR2Configured: mocks.isR2Configured, getR2Env: vi.fn() }));
vi.mock("@/lib/r2/client", () => ({
  presignAudioUpload: mocks.presignAudioUpload,
  headAudioObject: mocks.headAudioObject,
  readAudioObjectStart: mocks.readAudioObjectStart,
  deleteAudioObjects: mocks.deleteAudioObjects,
  audioReadUrl: mocks.audioReadUrl,
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => mocks.supabase }));

import {
  deleteSermonAction,
  discardAudioUploadsAction,
  prepareAudioUploadsAction,
  saveSermonAction,
  type SaveSermonInput,
} from "@/app/admin/actions";

type Result = { data: unknown; error: unknown };

/** Faux client Supabase : réponses programmées par table, appels enregistrés. */
class FakeSupabase {
  tables: Record<string, Result[]> = {};
  rpcResult: Result = { data: null, error: null };
  rpc = vi.fn(async () => this.rpcResult);
  storageRemove = vi.fn(async () => ({ data: [], error: null }));
  storage = { from: vi.fn(() => ({ remove: this.storageRemove })) };
  from = vi.fn((table: string) => {
    const result = this.tables[table]?.shift() ?? { data: [], error: null };
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "delete", "order", "limit", "maybeSingle"]) query[method] = vi.fn(() => query);
    query.then = (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return query;
  });
}

const SERMON = "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const KEY = `sermons/${SERMON}/9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d.mp3`;
const MEMBER = { id: "u1", email: "m@example.org", role: "member" as const };
const ADMIN = { ...MEMBER, role: "admin" as const };
const MP3_START = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0]);

function input(overrides: Partial<SaveSermonInput> = {}): SaveSermonInput {
  return {
    id: SERMON,
    date: "2026-11-01",
    title: "La foi",
    scriptureReferences: ["Hébreux 11:1"],
    notes: "",
    language: "fr",
    published: true,
    audio: [
      {
        name: "Culte",
        storagePath: KEY,
        duration: 1800,
        format: "mp3",
        mimeType: "image/png",
        size: 1000,
        downloadable: true,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  delete process.env.NEXT_PUBLIC_AUDIO_MAX_MB;
  vi.clearAllMocks();
  mocks.isR2Configured.mockReturnValue(true);
  mocks.requireTeamMember.mockResolvedValue(MEMBER);
  mocks.headAudioObject.mockResolvedValue({ size: 1000, contentType: "audio/mpeg" });
  mocks.readAudioObjectStart.mockResolvedValue(MP3_START);
  mocks.supabase = new FakeSupabase();
  mocks.supabase.rpcResult = { data: { id: SERMON, removed_paths: [], removed_files: [] }, error: null };
});

describe("prepareAudioUploadsAction — autorisation d'envoi", () => {
  it("refuse un visiteur ou un compte hors équipe", async () => {
    mocks.requireTeamMember.mockResolvedValue(null);
    expect(await prepareAudioUploadsAction(SERMON, [{ format: "mp3", size: 10 }])).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(mocks.presignAudioUpload).not.toHaveBeenCalled();
  });

  it("renvoie des clés générées par le serveur dans le dossier de la prédication", async () => {
    const result = await prepareAudioUploadsAction(SERMON, [
      { format: "mp3", size: 10 },
      { format: "webm", size: 20 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0].key).toMatch(new RegExp(`^sermons/${SERMON}/[0-9a-f-]{36}\\.mp3$`));
    expect(result.data[0].contentType).toBe("audio/mpeg");
    expect(result.data[1].contentType).toBe("audio/webm");
    expect(result.data[0].key).not.toBe(result.data[1].key);
  });

  it("refuse les formats non autorisés et les tailles invalides", async () => {
    expect(await prepareAudioUploadsAction(SERMON, [{ format: "flac", size: 10 }])).toMatchObject({
      error: "invalidAudio",
    });
    expect(await prepareAudioUploadsAction(SERMON, [{ format: "exe", size: 10 }])).toMatchObject({
      error: "invalidAudio",
    });
    expect(await prepareAudioUploadsAction(SERMON, [{ format: "mp3", size: 0 }])).toMatchObject({
      error: "invalidAudio",
    });
    expect(await prepareAudioUploadsAction(SERMON, [{ format: "mp3", size: 51_000_000 }])).toMatchObject({
      error: "tooLarge",
    });
    expect(await prepareAudioUploadsAction("../../etc", [{ format: "mp3", size: 10 }])).toMatchObject({
      error: "invalid",
    });
  });

  it("refuse l'envoi tant que la mise à jour SQL n'est pas installée", async () => {
    mocks.supabase.tables.audio_files = [{ data: null, error: { code: "42703", message: "column does not exist" } }];
    expect(await prepareAudioUploadsAction(SERMON, [{ format: "mp3", size: 10 }])).toMatchObject({
      error: "storageNotConfigured",
    });
    expect(mocks.presignAudioUpload).not.toHaveBeenCalled();
  });

  it("indique que le stockage n'est pas configuré", async () => {
    mocks.isR2Configured.mockReturnValue(false);
    expect(await prepareAudioUploadsAction(SERMON, [{ format: "mp3", size: 10 }])).toMatchObject({
      error: "storageNotConfigured",
    });
  });
});

describe("saveSermonAction — vérification des fichiers reçus", () => {
  it("enregistre la taille et le type constatés sur R2, pas ceux du navigateur", async () => {
    const result = await saveSermonAction(input());
    expect(result).toEqual({ ok: true, data: { id: SERMON } });
    const [, args] = mocks.supabase.rpc.mock.calls[0] as unknown as [string, { p_audio: Record<string, unknown>[] }];
    expect(args.p_audio[0]).toMatchObject({ storage_path: KEY, mime_type: "audio/mpeg", size_bytes: 1000 });
    expect(mocks.updateTag).toHaveBeenCalledWith("sermons");
  });

  it("refuse une clé qui n'appartient pas à la prédication", async () => {
    const other = `sermons/11111111-1111-4111-8111-111111111111/9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d.mp3`;
    const base = input();
    const result = await saveSermonAction(input({ audio: [{ ...base.audio[0], storagePath: other }] }));
    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(mocks.supabase.rpc).not.toHaveBeenCalled();
  });

  it("refuse un fichier absent de R2 (envoi interrompu)", async () => {
    mocks.headAudioObject.mockResolvedValue(null);
    expect(await saveSermonAction(input())).toEqual({ ok: false, error: "invalidAudio" });
    expect(mocks.supabase.rpc).not.toHaveBeenCalled();
  });

  it("refuse un fichier dont le contenu n'est pas celui annoncé", async () => {
    mocks.readAudioObjectStart.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    expect(await saveSermonAction(input())).toEqual({ ok: false, error: "invalidAudio" });
    expect(mocks.supabase.rpc).not.toHaveBeenCalled();
  });

  it("refuse un fichier trop volumineux même s'il a été envoyé", async () => {
    mocks.headAudioObject.mockResolvedValue({ size: 60_000_000, contentType: "audio/mpeg" });
    expect(await saveSermonAction(input())).toEqual({ ok: false, error: "tooLarge" });
  });

  it("supprime chaque fichier retiré là où il est stocké (R2 ou ancien bucket non migré)", async () => {
    const legacy = `sermons/${SERMON}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp3`;
    const old = `sermons/${SERMON}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.mp3`;
    mocks.supabase.rpcResult = {
      data: {
        id: SERMON,
        removed_paths: [old, legacy],
        removed_files: [
          { storage_path: old, storage_provider: "r2" },
          { storage_path: legacy, storage_provider: "supabase" },
        ],
      },
      error: null,
    };
    await saveSermonAction(input());
    expect(mocks.deleteAudioObjects).toHaveBeenCalledWith([old]);
    // Le fichier R2 n'est jamais supprimé de Supabase (sa copie d'origine y reste jusqu'à validation).
    expect(mocks.supabase.storageRemove).toHaveBeenCalledWith([legacy]);
    expect(mocks.supabase.storageRemove).toHaveBeenCalledTimes(1);
  });

  it("refuse un utilisateur hors équipe", async () => {
    mocks.requireTeamMember.mockResolvedValue(null);
    expect(await saveSermonAction(input())).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.headAudioObject).not.toHaveBeenCalled();
  });
});

describe("discardAudioUploadsAction — nettoyage après un échec", () => {
  it("ne supprime que des clés de la prédication non référencées en base", async () => {
    const used = `sermons/${SERMON}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.mp3`;
    const foreign = `sermons/11111111-1111-4111-8111-111111111111/dddddddd-dddd-4ddd-8ddd-dddddddddddd.mp3`;
    mocks.supabase.tables.audio_files = [{ data: [{ storage_path: used }], error: null }];
    await discardAudioUploadsAction(SERMON, [KEY, used, foreign, "../secret"]);
    expect(mocks.deleteAudioObjects).toHaveBeenCalledWith([KEY]);
  });

  it("refuse un utilisateur hors équipe", async () => {
    mocks.requireTeamMember.mockResolvedValue(null);
    expect(await discardAudioUploadsAction(SERMON, [KEY])).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.deleteAudioObjects).not.toHaveBeenCalled();
  });
});

describe("deleteSermonAction — suppression réservée aux administrateurs", () => {
  it("refuse un simple membre", async () => {
    expect(await deleteSermonAction(SERMON)).toEqual({ ok: false, error: "forbidden" });
    expect(mocks.supabase.from).not.toHaveBeenCalled();
  });

  it("supprime la prédication puis ses fichiers sur R2", async () => {
    mocks.requireTeamMember.mockResolvedValue(ADMIN);
    mocks.supabase.tables.audio_files = [{ data: [{ storage_path: KEY, storage_provider: "r2" }], error: null }];
    mocks.supabase.tables.sermons = [{ data: [{ id: SERMON }], error: null }];
    expect(await deleteSermonAction(SERMON)).toEqual({ ok: true, data: null });
    expect(mocks.deleteAudioObjects).toHaveBeenCalledWith([KEY]);
  });

  it("ne supprime aucun fichier si la prédication n'a pas été supprimée", async () => {
    mocks.requireTeamMember.mockResolvedValue(ADMIN);
    mocks.supabase.tables.audio_files = [{ data: [{ storage_path: KEY, storage_provider: "r2" }], error: null }];
    mocks.supabase.tables.sermons = [{ data: [], error: null }];
    expect(await deleteSermonAction(SERMON)).toEqual({ ok: false, error: "notFound" });
    expect(mocks.deleteAudioObjects).not.toHaveBeenCalled();
  });
});
