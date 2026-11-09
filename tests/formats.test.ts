import { describe, expect, it } from "vitest";
import {
  buildAudioKey,
  contentMatchesFormat,
  formatFromFile,
  formatFromMimeType,
  isValidStoredKey,
  parseUploadKey,
  sniffAudioFormat,
} from "@/lib/audio/formats";

const SERMON = "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const FILE = "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("formats acceptés", () => {
  it("accepte MP3, WAV, M4A, AAC, OGG et WebM d'après l'extension", () => {
    expect(formatFromFile("culte.mp3", "audio/mpeg")).toBe("mp3");
    expect(formatFromFile("culte.WAV", "audio/x-wav")).toBe("wav");
    expect(formatFromFile("culte.m4a", "audio/x-m4a")).toBe("m4a");
    expect(formatFromFile("culte.ogg", "audio/ogg")).toBe("ogg");
    expect(formatFromFile("culte.webm", "video/webm")).toBe("webm");
    expect(formatFromFile("20240420_191544.aac", "audio/aac")).toBe("aac");
    expect(formatFromFile("20240420_191544.aac", "")).toBe("aac");
  });

  it("tolère un type MIME absent ou générique (téléphones)", () => {
    expect(formatFromFile("culte.m4a", "")).toBe("m4a");
    expect(formatFromFile("culte.mp3", "application/octet-stream")).toBe("mp3");
  });

  it("refuse les autres formats et les types manifestement non audio", () => {
    expect(formatFromFile("culte.flac", "audio/flac")).toBeNull();
    expect(formatFromFile("photo.jpg", "image/jpeg")).toBeNull();
    expect(formatFromFile("faux.mp3", "image/png")).toBeNull();
    expect(formatFromFile("script.mp3.exe", "application/x-msdownload")).toBeNull();
  });

  it("reconnaît le format des enregistrements du micro", () => {
    expect(formatFromMimeType("audio/webm;codecs=opus")).toBe("webm");
    expect(formatFromMimeType("audio/mp4")).toBe("m4a");
    expect(formatFromMimeType("audio/ogg;codecs=opus")).toBe("ogg");
    expect(formatFromMimeType("audio/flac")).toBeNull();
  });
});

describe("reconnaissance du contenu réel", () => {
  it("identifie chaque format par sa signature", () => {
    expect(sniffAudioFormat(bytes("ID3", 4, 0, 0))).toBe("mp3");
    expect(sniffAudioFormat(bytes(0xff, 0xfb, 0x90, 0x64))).toBe("mp3");
    expect(sniffAudioFormat(bytes("RIFF", 0, 0, 0, 0, "WAVE"))).toBe("wav");
    expect(sniffAudioFormat(bytes(0, 0, 0, 0x20, "ftypM4A "))).toBe("m4a");
    expect(sniffAudioFormat(bytes("OggS", 0))).toBe("ogg");
    expect(sniffAudioFormat(bytes(0x1a, 0x45, 0xdf, 0xa3, 0x9f))).toBe("webm");
    expect(sniffAudioFormat(bytes(0xff, 0xf1, 0x50, 0x80))).toBe("aac");
    expect(sniffAudioFormat(bytes(0xff, 0xf9, 0x50, 0x80))).toBe("aac");
    expect(sniffAudioFormat(bytes("ADIF"))).toBe("aac");
  });

  it("accepte les variantes de .aac des téléphones (ADTS, MP4, ID3 + ADTS)", () => {
    expect(contentMatchesFormat("aac", bytes(0xff, 0xf1, 0x50, 0x80))).toBe(true);
    expect(contentMatchesFormat("aac", bytes(0, 0, 0, 0x20, "ftypM4A "))).toBe(true);
    expect(contentMatchesFormat("aac", bytes("ID3", 4, 0, 0))).toBe(true);
    expect(contentMatchesFormat("aac", bytes("%PDF-1.7"))).toBe(false);
    expect(contentMatchesFormat("mp3", bytes(0xff, 0xf1, 0x50, 0x80))).toBe(false);
  });

  it("rejette un contenu qui n'est pas audio", () => {
    expect(sniffAudioFormat(bytes(0x89, "PNG"))).toBeNull();
    expect(sniffAudioFormat(bytes("%PDF-1.7"))).toBeNull();
    expect(sniffAudioFormat(bytes("fLaC"))).toBeNull();
    expect(sniffAudioFormat(new Uint8Array())).toBeNull();
  });
});

describe("clés de stockage", () => {
  it("n'accepte que des clés générées pour la prédication concernée", () => {
    const key = buildAudioKey(SERMON, FILE, "mp3");
    expect(parseUploadKey(key, SERMON)).toEqual({ format: "mp3" });
    expect(parseUploadKey(key, "11111111-1111-4111-8111-111111111111")).toBeNull();
  });

  it("refuse les chemins arbitraires", () => {
    for (const key of [
      `sermons/${SERMON}/../${FILE}.mp3`,
      `sermons/${SERMON}/${FILE}.flac`,
      `autre/${SERMON}/${FILE}.mp3`,
      `/sermons/${SERMON}/${FILE}.mp3`,
      `sermons/${SERMON}/${FILE}.mp3?x=1`,
      `sermons/${SERMON}/sub/${FILE}.mp3`,
      42,
      null,
    ]) {
      expect(parseUploadKey(key, SERMON)).toBeNull();
    }
    expect(isValidStoredKey(`sermons/${SERMON}/../../secret.mp3`)).toBe(false);
  });

  it("accepte les clés des anciens fichiers Supabase (migration)", () => {
    expect(isValidStoredKey(`sermons/${SERMON}/${FILE}.flac`)).toBe(true);
  });
});
