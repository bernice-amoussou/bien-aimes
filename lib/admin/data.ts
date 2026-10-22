import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SERMON_SELECT, mapSermonRow, type SermonWithAudioRow } from "@/lib/supabase/mappers";
import { createServerSupabase } from "@/lib/supabase/server";
import type { TeamMemberRow } from "@/lib/supabase/database.types";
import type { Sermon } from "@/types/sermon";

/** Toutes les prédications, brouillons compris (RLS : réservé à l'équipe). */
export async function getAllSermonsForTeam(): Promise<Sermon[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("sermons")
    .select(SERMON_SELECT)
    .order("preached_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Lecture des prédications impossible : ${error.message}`);
  return (data as unknown as SermonWithAudioRow[]).map(mapSermonRow);
}

/** Membres de l'équipe (RLS : la liste complète n'est visible que des administrateurs). */
export async function getTeamMembers(): Promise<TeamMemberRow[]> {
  // Sans Supabase, le layout affiche les instructions de configuration à la place de la page.
  if (!isSupabaseConfigured()) return [];
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("team_members")
    .select("user_id, email, role, created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Lecture de l'équipe impossible : ${error.message}`);
  return data;
}
