import "server-only";
import { cache } from "react";
import type { TeamRole } from "@/lib/supabase/database.types";
import { createServerSupabase } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
}

export interface TeamMember extends CurrentUser {
  role: TeamRole;
}

export type AdminAccess =
  | { status: "signed-out" }
  | { status: "not-member"; user: CurrentUser }
  | { status: "member"; member: TeamMember };

/**
 * Utilisateur connecté et son rôle d'équipe. Lit les cookies : à appeler
 * sous <Suspense> ou dans une Server Action. Mémorisé pour la requête.
 *
 * `getUser()` valide le jeton auprès de Supabase Auth (contrairement à
 * `getSession()`), on peut donc s'y fier pour l'autorisation.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "signed-out" };

  const user: CurrentUser = { id: data.user.id, email: data.user.email ?? null };
  const { data: row } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return { status: "not-member", user };
  return { status: "member", member: { ...user, role: row.role } };
});

/** Pour les Server Actions : renvoie le membre ou `null` si l'accès est refusé. */
export async function requireTeamMember(): Promise<TeamMember | null> {
  const access = await getAdminAccess();
  return access.status === "member" ? access.member : null;
}
