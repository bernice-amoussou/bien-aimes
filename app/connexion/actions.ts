"use server";

import { timingSafeEqual } from "node:crypto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export type SignInError = "invalidCredentials" | "emailNotConfirmed" | "rateLimited" | "network" | "unknown";

export type SignInResult = { ok: true } | { ok: false; error: SignInError };

/** Comparaison en temps constant, insensible aux variantes Unicode (é composé ou non). */
function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a.normalize("NFC"));
  const right = Buffer.from(b.normalize("NFC"));
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Identifiant simplifié de l'équipe (variables TEAM_LOGIN_*, lues uniquement ici,
 * côté serveur) : renvoie les identifiants réels du compte Supabase associé.
 */
function resolveShortcut(identifier: string, password: string): { email: string; password: string } | null {
  const username = process.env.TEAM_LOGIN_USERNAME?.trim();
  const shortcutPassword = process.env.TEAM_LOGIN_PASSWORD;
  const email = process.env.TEAM_LOGIN_EMAIL?.trim();
  const accountPassword = process.env.TEAM_LOGIN_ACCOUNT_PASSWORD;
  if (!username || !shortcutPassword || !email || !accountPassword) return null;

  // Accents facultatifs : « aimés » et « aimes » sont acceptés (claviers de téléphone).
  const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const usernameOk = sameText(fold(identifier.trim().toLowerCase()), fold(username.toLowerCase()));
  const passwordOk = sameText(fold(password), fold(shortcutPassword));
  return usernameOk && passwordOk ? { email, password: accountPassword } : null;
}

function mapAuthError(error: { code?: string; status?: number; message: string }): SignInError {
  if (error.code === "invalid_credentials") return "invalidCredentials";
  if (error.code === "email_not_confirmed") return "emailNotConfirmed";
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rateLimited";
  if (error.status === 0 || /fetch|network/i.test(error.message)) return "network";
  return "unknown";
}

/**
 * Connexion de l'équipe : identifiant simplifié ou adresse e-mail + mot de passe.
 * La session est ouverte côté serveur (cookies Supabase) ; aucun identifiant réel
 * n'est envoyé au navigateur.
 */
export async function signInAction(identifier: string, password: string): Promise<SignInResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unknown" };
  if (typeof identifier !== "string" || typeof password !== "string" || !identifier.trim() || !password) {
    return { ok: false, error: "invalidCredentials" };
  }

  const shortcut = resolveShortcut(identifier, password);
  const credentials = shortcut ?? { email: identifier.trim(), password };

  // Un identifiant qui n'est ni le raccourci ni une adresse e-mail : refus, sans appeler Supabase.
  if (!shortcut && !credentials.email.includes("@")) {
    // Léger délai : ralentit les essais répétés sur l'identifiant simplifié.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { ok: false, error: "invalidCredentials" };
  }

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) return { ok: false, error: mapAuthError(error) };
  } catch {
    return { ok: false, error: "network" };
  }
  return { ok: true };
}
