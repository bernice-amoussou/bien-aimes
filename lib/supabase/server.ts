import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { requireSupabaseEnv } from "./config";
import type { Database } from "./database.types";

/**
 * Client lié à la session de l'utilisateur (cookies) : RLS s'applique avec
 * ses droits. À utiliser dans les Server Components (sous <Suspense>)
 * et les Server Actions.
 */
export async function createServerSupabase() {
  const { url, key } = requireSupabaseEnv();
  // Le client Supabase lit l'horloge (expiration des jetons) : on exclut ce rendu
  // de tout prérendu, y compris le préchargement des pages de session.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : les cookies y sont en lecture seule.
          // Le proxy (proxy.ts) se charge de rafraîchir la session.
        }
      },
    },
  });
}
