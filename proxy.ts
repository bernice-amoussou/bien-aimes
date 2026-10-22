import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/config";

/**
 * Rafraîchit la session Supabase (cookies) et protège /admin.
 * Ce n'est qu'une première barrière : le layout d'administration et chaque
 * Server Action revérifient l'utilisateur et son rôle, et RLS s'applique en base.
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
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    const login = request.nextUrl.clone();
    login.pathname = "/connexion";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
