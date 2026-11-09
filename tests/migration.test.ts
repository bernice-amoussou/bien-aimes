import { describe, expect, it, vi } from "vitest";
import { findOrphans, migrateRows, verifyRows } from "@/scripts/lib/audio-migration.mjs";

const SERMON = "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const key = (n: number) => `sermons/${SERMON}/0000000${n}-0000-4000-8000-000000000000.mp3`;

type Row = {
  id: string;
  storage_path: string;
  storage_provider: "supabase" | "r2";
  size_bytes: number | null;
  mime_type: string | null;
  format: string;
};

const row = (n: number, overrides: Partial<Row> = {}): Row => ({
  id: `id-${n}`,
  storage_path: key(n),
  storage_provider: "supabase",
  size_bytes: 4,
  mime_type: "audio/mpeg",
  format: "mp3",
  ...overrides,
});

/** Faux Supabase Storage + R2 + base, en mémoire. Supabase n'expose AUCUNE suppression. */
function world(source: Record<string, Uint8Array>) {
  const r2 = new Map<string, Uint8Array>();
  const providers = new Map<string, string>();
  const deps = {
    head: vi.fn(async (k: string) => (r2.has(k) ? { size: r2.get(k)!.byteLength } : null)),
    download: vi.fn(async (k: string) => {
      if (!source[k]) throw new Error("introuvable");
      return source[k];
    }),
    put: vi.fn(async (k: string, body: Uint8Array) => {
      r2.set(k, body);
    }),
    markMigrated: vi.fn(async (id: string) => {
      if (providers.get(id) === "r2") return false;
      providers.set(id, "r2");
      return true;
    }),
  };
  return { r2, providers, deps };
}

const four = () => new Uint8Array([1, 2, 3, 4]);

describe("migration Supabase Storage → R2", () => {
  it("copie, vérifie puis bascule chaque fichier, sans rien supprimer", async () => {
    const source = { [key(1)]: four(), [key(2)]: four() };
    const { r2, deps } = world(source);
    const report = await migrateRows([row(1), row(2)], deps);

    expect(report).toMatchObject({ copied: 2, marked: 2, failed: [] });
    expect([...r2.keys()]).toEqual([key(1), key(2)]);
    expect(deps.put).toHaveBeenCalledWith(key(1), source[key(1)], "audio/mpeg");
    expect(Object.keys(source)).toHaveLength(2);
  });

  it("est relançable : un fichier déjà copié n'est ni recopié ni dupliqué", async () => {
    const { r2, deps } = world({ [key(1)]: four() });
    r2.set(key(1), four());
    const report = await migrateRows([row(1)], deps);
    expect(report).toMatchObject({ copied: 0, reused: 1, marked: 1 });
    expect(deps.put).not.toHaveBeenCalled();
    expect(deps.download).not.toHaveBeenCalled();
  });

  it("ignore les fichiers déjà migrés", async () => {
    const { deps } = world({});
    const report = await migrateRows([row(1, { storage_provider: "r2" })], deps);
    expect(report).toMatchObject({ alreadyMigrated: 1, pending: 0 });
    expect(deps.head).not.toHaveBeenCalled();
  });

  it("recopie une copie partielle (taille différente) laissée par une exécution interrompue", async () => {
    const { r2, deps } = world({ [key(1)]: four() });
    r2.set(key(1), new Uint8Array([1]));
    const report = await migrateRows([row(1)], deps);
    expect(report).toMatchObject({ copied: 1, marked: 1 });
    expect(r2.get(key(1))?.byteLength).toBe(4);
  });

  it("ne bascule pas une ligne si la copie n'a pas pu être vérifiée", async () => {
    const { deps } = world({ [key(1)]: four() });
    deps.put.mockImplementation(async () => {}); // l'écriture « réussit » mais rien n'arrive sur R2
    const report = await migrateRows([row(1)], deps);
    expect(report.failed).toHaveLength(1);
    expect(deps.markMigrated).not.toHaveBeenCalled();
  });

  it("continue après l'échec d'un fichier", async () => {
    const { deps } = world({ [key(2)]: four() });
    const report = await migrateRows([row(1), row(2)], deps);
    expect(report.failed).toEqual([expect.objectContaining({ id: "id-1" })]);
    expect(report).toMatchObject({ copied: 1, marked: 1 });
  });

  it("refuse une clé invalide", async () => {
    const { deps } = world({});
    const report = await migrateRows([row(1, { storage_path: "../secret.mp3" })], deps);
    expect(report.failed).toHaveLength(1);
    expect(deps.download).not.toHaveBeenCalled();
  });

  it("en simulation, n'écrit ni sur R2 ni en base", async () => {
    const { r2, deps } = world({ [key(1)]: four() });
    const report = await migrateRows([row(1)], deps, { dryRun: true });
    expect(report).toMatchObject({ planned: 1, copied: 0, marked: 0 });
    expect(r2.size).toBe(0);
    expect(deps.markMigrated).not.toHaveBeenCalled();
  });
});

describe("vérification et fichiers orphelins", () => {
  it("détecte les fichiers absents, de taille différente ou pas encore migrés", async () => {
    const r2 = new Map([
      [key(1), 4],
      [key(2), 9],
    ]);
    const report = await verifyRows(
      [row(1, { storage_provider: "r2" }), row(2, { storage_provider: "r2" }), row(3, { storage_provider: "r2" }), row(4)],
      { head: async (k: string) => (r2.has(k) ? { size: r2.get(k)! } : null) },
    );
    expect(report).toEqual({ ok: 1, sizeMismatch: [key(2)], missing: [key(3)], pending: [key(4)] });
  });

  it("ne signale que les fichiers non référencés et assez anciens", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const old = new Date("2026-11-06T12:00:00Z");
    const recent = new Date("2026-11-08T11:00:00Z");
    const orphans = findOrphans(
      [
        { key: key(1), lastModified: old },
        { key: key(2), lastModified: old },
        { key: key(3), lastModified: recent },
        { key: "autre/fichier.mp3", lastModified: old },
      ],
      new Set([key(1)]),
      { now },
    );
    expect(orphans.map((o) => o.key)).toEqual([key(2)]);
  });
});
