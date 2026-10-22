"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TeamMember } from "@/lib/admin/auth";
import type { Sermon } from "@/types/sermon";

/**
 * Données de l'administration, chargées côté serveur par le layout
 * (session vérifiée, RLS appliquée). Après une mutation, `router.refresh()`
 * recharge le layout et donc ce contexte.
 */
interface AdminContextValue {
  sermons: Sermon[];
  member: TeamMember;
  isAdmin: boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({
  sermons,
  member,
  children,
}: {
  sermons: Sermon[];
  member: TeamMember;
  children: ReactNode;
}) {
  return (
    <AdminContext.Provider value={{ sermons, member, isAdmin: member.role === "admin" }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin doit être utilisé dans un <AdminProvider>.");
  return context;
}
