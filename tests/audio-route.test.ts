import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublishedAudio: vi.fn(),
  getAudioForSession: vi.fn(),
  audioReadUrl: vi.fn(),
  isR2Configured: vi.fn(() => true),
}));

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/audio/lookup", () => ({
  getPublishedAudio: mocks.getPublishedAudio,
  getAudioForSession: mocks.getAudioForSession,
}));
vi.mock("@/lib/r2/config", () => ({ isR2Configured: mocks.isR2Configured, getR2Env: vi.fn() }));
vi.mock("@/lib/r2/client", () => ({ audioReadUrl: mocks.audioReadUrl, deleteAudioObjects: vi.fn() }));

import { GET } from "@/app/api/audio/[id]/route";

const ID = "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d";
const SERMON = "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const row = (overrides = {}) => ({
  id: ID,
  name: "Culte du dimanche",
  format: "mp3",
  mime_type: "audio/mpeg",
  storage_path: `sermons/${SERMON}/${ID}.mp3`,
  storage_provider: "r2",
  is_downloadable: true,
  ...overrides,
});

function call(query = "", cookies = "") {
  const request = new NextRequest(`http://localhost/api/audio/${ID}${query}`, {
    headers: cookies ? { cookie: cookies } : {},
  });
  return GET(request, { params: Promise.resolve({ id: ID }) });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  vi.clearAllMocks();
  mocks.isR2Configured.mockReturnValue(true);
  mocks.audioReadUrl.mockResolvedValue("https://compte.r2.cloudflarestorage.com/signed");
});

describe("lecture publique", () => {
  it("redirige vers une URL R2 signée pour une prédication publiée", async () => {
    mocks.getPublishedAudio.mockResolvedValue(row());
    const response = await call();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://compte.r2.cloudflarestorage.com/signed");
    expect(mocks.audioReadUrl).toHaveBeenCalledWith(
      `sermons/${SERMON}/${ID}.mp3`,
      expect.objectContaining({ allowPublic: true, downloadName: undefined }),
    );
  });

  it("propose le téléchargement avec un nom de fichier lisible", async () => {
    mocks.getPublishedAudio.mockResolvedValue(row());
    await call("?download=1");
    expect(mocks.audioReadUrl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ downloadName: "Culte du dimanche.mp3" }),
    );
  });

  it("refuse le téléchargement d'un fichier qui ne l'autorise pas", async () => {
    mocks.getPublishedAudio.mockResolvedValue(row({ is_downloadable: false }));
    expect((await call("?download=1")).status).toBe(403);
  });

  it("lit les anciens fichiers depuis Supabase Storage tant qu'ils ne sont pas migrés", async () => {
    mocks.getPublishedAudio.mockResolvedValue(row({ storage_provider: "supabase" }));
    const response = await call();
    expect(response.headers.get("location")).toBe(
      `https://projet.supabase.co/storage/v1/object/public/sermon-audio/sermons/${SERMON}/${ID}.mp3`,
    );
    expect(mocks.audioReadUrl).not.toHaveBeenCalled();
  });
});

describe("brouillons", () => {
  it("sont introuvables pour un visiteur sans session", async () => {
    mocks.getPublishedAudio.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
    expect(mocks.getAudioForSession).not.toHaveBeenCalled();
  });

  it("sont introuvables pour une session hors équipe (RLS ne renvoie rien)", async () => {
    mocks.getPublishedAudio.mockResolvedValue(null);
    mocks.getAudioForSession.mockResolvedValue(null);
    expect((await call("", "sb-projet-auth-token=abc")).status).toBe(404);
  });

  it("sont lisibles par l'équipe, sans domaine public ni mise en cache", async () => {
    mocks.getPublishedAudio.mockResolvedValue(null);
    mocks.getAudioForSession.mockResolvedValue(row());
    const response = await call("", "sb-projet-auth-token=abc");
    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.audioReadUrl).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ allowPublic: false }));
  });
});

describe("robustesse", () => {
  it("rejette un identifiant mal formé sans interroger la base", async () => {
    const request = new NextRequest("http://localhost/api/audio/..%2F..%2Fetc");
    const response = await GET(request, { params: Promise.resolve({ id: "../../etc" }) });
    expect(response.status).toBe(404);
    expect(mocks.getPublishedAudio).not.toHaveBeenCalled();
  });

  it("ne suit jamais une clé de stockage invalide enregistrée en base", async () => {
    mocks.getPublishedAudio.mockResolvedValue(row({ storage_path: "../../autre-bucket/secret.mp3" }));
    expect((await call()).status).toBe(404);
    expect(mocks.audioReadUrl).not.toHaveBeenCalled();
  });

  it("répond 503 si R2 n'est pas configuré", async () => {
    mocks.isR2Configured.mockReturnValue(false);
    mocks.getPublishedAudio.mockResolvedValue(row());
    expect((await call()).status).toBe(503);
  });
});
