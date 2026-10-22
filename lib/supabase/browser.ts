"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./config";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | null = null;

/** Client navigateur (connexion, téléversement direct vers Storage). */
export function getBrowserSupabase(): SupabaseClient<Database> {
  if (!client) {
    const { url, key } = requireSupabaseEnv();
    client = createBrowserClient<Database>(url, key);
  }
  return client;
}
