import { NextResponse, type NextRequest } from "next/server";
import { getAudioForSession, getPublishedAudio } from "@/lib/audio/lookup";
import { resolveAudioUrl } from "@/lib/audio/storage";
import { isValidStoredKey } from "@/lib/audio/formats";
import { isR2Configured } from "@/lib/r2/config";
import { isUuid } from "@/lib/sermon-utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Lecture et téléchargement d'un fichier audio : /api/audio/<id>[?download=1]
 *
 * 1. Prédication publiée → accessible à tous.
 * 2. Sinon (brouillon) → uniquement avec une session d'équipe (vérifiée par RLS).
 * 3. Redirection vers une URL signée R2 à durée limitée (ou vers l'ancien
 *    bucket Supabase pour un fichier pas encore migré).
 *
 * La clé de stockage vient TOUJOURS de la base, jamais de la requête.
 */

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

function notFound() {
  return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) return notFound();
  const download = request.nextUrl.searchParams.get("download") === "1";

  let file = await getPublishedAudio(id);
  const published = file !== null;
  if (!file && hasSessionCookie(request)) file = await getAudioForSession(id);
  if (!file || !isValidStoredKey(file.storage_path)) return notFound();

  if (download && !file.is_downloadable) {
    return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (file.storage_provider === "r2" && !isR2Configured()) {
    return new NextResponse("Audio storage unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const target = await resolveAudioUrl(file, { download, publicAccess: published });
  return NextResponse.redirect(target, {
    status: 302,
    headers: {
      // Les URL signées expirent : la redirection n'est gardée que brièvement, et jamais en cache partagé.
      "Cache-Control": published ? "private, max-age=300" : "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
