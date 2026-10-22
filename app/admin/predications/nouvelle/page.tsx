import type { Metadata } from "next";
import { NewSermonView } from "@/components/admin/sermon-editor";

export const metadata: Metadata = { title: "Nouvelle prédication" };

export default function NewSermonPage() {
  return <NewSermonView />;
}
