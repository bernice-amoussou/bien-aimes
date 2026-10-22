import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./config";
import type { Database } from "./database.types";

/**
 * Client sans session, avec le rôle `anon` : ne voit que ce que RLS autorise
 * aux visiteurs (prédications publiées). Sans cookie, il peut être utilisé
 * dans des fonctions mises en cache (`'use cache'`).
 */
export function createPublicSupabase() {
  const { url, key } = requireSupabaseEnv();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
