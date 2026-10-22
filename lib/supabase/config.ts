/**
 * Configuration Supabase lue depuis les variables d'environnement publiques.
 * Aucune clé secrète n'est utilisée par l'application : l'URL et la clé
 * « publishable » sont publiques par conception, la sécurité repose sur RLS.
 */

export const AUDIO_BUCKET = "sermon-audio";

export interface SupabaseEnv {
  url: string;
  key: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase n'est pas configuré : renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local.",
    );
  }
  return env;
}

/** Taille maximale d'un fichier audio, en octets (NEXT_PUBLIC_AUDIO_MAX_MB, 50 Mo par défaut). */
export function getAudioMaxBytes(): number {
  const mb = Number(process.env.NEXT_PUBLIC_AUDIO_MAX_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 50) * 1000 * 1000;
}
