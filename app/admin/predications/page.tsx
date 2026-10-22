import type { Metadata } from "next";
import { AdminSermonsTable } from "@/components/admin/admin-sermons-table";

export const metadata: Metadata = { title: "Prédications" };

export default function AdminSermonsPage() {
  return <AdminSermonsTable />;
}
