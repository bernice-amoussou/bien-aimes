import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/config";

/** Destination autorisée après connexion : uniquement une page de l'administration. */
function safeNext(value: string | null): string {
  return value && /^\/admin(\/|$)/.test(value) ? value : "/admin";
}

/**
 * Rafraîchit la session Supabase (cookies) et protège /admin.
 * Ce n'est qu'une première barrière : le layout d'administration et chaque
 * Server Action revérifient l'utilisateur et son rôle, et RLS s'applique en base.
 *
 * La session reste ouverte tant que l'utilisateur ne se déconnecte pas :
 * - un utilisateur déjà connecté qui ouvre /connexion est renvoyé vers l'administration ;
 * - une erreur réseau passagère n'est jamais interprétée comme une déconnexion.
 */
export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv();
  // Sans Supabase, /admin affiche les instructions de configuration.
  if (!env) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() valide le jeton et le rafraîchit si nécessaire : à appeler avant toute réponse.
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    // Conserve les cookies de session éventuellement rafraîchis.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (pathname === "/connexion" || pathname.startsWith("/connexion/")) {
    if (!signedIn) return response;
    const target = request.nextUrl.clone();
    target.pathname = safeNext(request.nextUrl.searchParams.get("next"));
    target.search = "";
    return redirectTo(target);
  }

  // Panne réseau passagère vers Supabase : on ne déconnecte pas, le layout revérifie.
  if (!signedIn && error && isAuthRetryableFetchError(error)) return response;

  if (!signedIn) {
    const login = request.nextUrl.clone();
    login.pathname = "/connexion";
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return redirectTo(login);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/connexion"],
};
