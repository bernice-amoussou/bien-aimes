import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProvider } from "@/components/admin/admin-store";
import { AccessDeniedView, AdminLoading, AdminSetupView } from "@/components/admin/admin-states";
import { getAdminAccess } from "@/lib/admin/auth";
import { getAllSermonsForTeam } from "@/lib/admin/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration · Bien-aimés" },
  robots: { index: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured()) return <AdminSetupView />;

  // La session se lit à la requête : sous <Suspense> avec Cache Components.
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  const access = await getAdminAccess();
  if (access.status === "signed-out") redirect("/connexion?next=/admin");
  if (access.status === "not-member") return <AccessDeniedView email={access.user.email ?? ""} />;

  const sermons = await getAllSermonsForTeam();
  return (
    <AdminProvider sermons={sermons} member={access.member}>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
