import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ responses: [] as { data: unknown; error: unknown }[], selects: [] as string[] }));

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/public", () => ({
  createPublicSupabase: () => ({
    from: () => {
      const query = {
        select: (columns: string) => {
          mocks.selects.push(columns);
          return query;
        },
        eq: () => query,
        maybeSingle: async () => mocks.responses.shift(),
      };
      return query;
    },
  }),
}));

import { getPublishedAudio } from "@/lib/audio/lookup";

const ID = "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d";
const base = { id: ID, name: "Culte", format: "mp3", mime_type: null, storage_path: "sermons/x/y.mp3", is_downloadable: true };

beforeEach(() => {
  mocks.responses = [];
  mocks.selects = [];
});

describe("compatibilité pendant la migration", () => {
  it("lit l'emplacement du fichier quand la base est à jour", async () => {
    mocks.responses = [{ data: { ...base, storage_provider: "r2" }, error: null }];
    expect(await getPublishedAudio(ID)).toMatchObject({ storage_provider: "r2" });
  });

  it("considère les fichiers comme Supabase tant que la mise à jour SQL n'est pas faite", async () => {
    mocks.responses = [
      { data: null, error: { code: "42703", message: "column audio_files.storage_provider does not exist" } },
      { data: base, error: null },
    ];
    expect(await getPublishedAudio(ID)).toMatchObject({ storage_provider: "supabase", storage_path: "sermons/x/y.mp3" });
    expect(mocks.selects[1]).not.toContain("storage_provider");
  });

  it("ne masque pas les autres erreurs", async () => {
    mocks.responses = [{ data: null, error: { code: "PGRST000", message: "panne" } }];
    await expect(getPublishedAudio(ID)).rejects.toThrow("panne");
  });
});
